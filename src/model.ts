import {maybeAsync, MaybePromise} from 'maybe-async';

import {
	FieldMask as Mask, FieldMaskConvertible as MaskConvertible,
} from 'field-mask';

import {NullStore} from './nullStore';
import {MaskedModel} from './maskedModel';
import {ValidationResult, ValidationError} from './validation';
import {Instance, InstanceEntries, InstanceData} from './instance';
import {Store, ItemId, PropertyName, ItemFilter, FindOptions} from './store';

import {
	Model$type, Model$id, ModelType, ModelView, FieldName, FieldValue, InstanceId,
	InstanceFilter, FieldMask, FieldMaskConvertible, FieldInformation, DependentName,
	DependentMask, DependentMaskConvertible, DependencyMask, 
} from './modelView';

export type DependencyMaskConvertible = MaskConvertible<PropertyName>;
type DependentEntry = [DependentName, { requires?: DependentMaskConvertible }];

export interface FieldValidator {
	(name: FieldName, value: FieldValue): MaybePromise<ValidationResult>;
}

export interface FieldTranslateHandler {
	(result: InstanceData, value: FieldValue): void;
}

export interface FieldDescriptor {
	validators?: FieldValidator[];
	translate?: FieldTranslateHandler;
	requires?: DependencyMaskConvertible;
	get?: (data: InstanceData) => MaybePromise<FieldValue> | undefined;
	set?: (data: InstanceData, value: FieldValue) => MaybePromise<void>;
}

export interface IntoFieldDescriptor {
	intoFieldDescriptor(): FieldDescriptor;
}

export interface AliasFieldDescriptor {
	readable?: boolean;
	writable?: boolean;
	default?: FieldValue;
	property?: PropertyName;
	validators?: FieldValidator[];
}

export type FieldDescriptorConvertible = FieldValue
                                       | AliasFieldDescriptor
                                       | IntoFieldDescriptor
                                       | FieldDescriptor;

export interface LinkDescriptor {
	requires?: FieldMaskConvertible;
	install: (model: Model) => void;
	exists: (model: ModelView) => boolean;
};

export class Model implements ModelView {
	public static readonly id = Model$id;
	public static readonly type = Model$type;

	public [Model$id]: FieldName = 'id';
	public [Model$type]: FieldName = 'type';
	
	private _store: Store;
	private _typeValue?: ModelType;
	private _fields: Map<FieldName, FieldDescriptor> = new Map;
	private _dependents: Map<DependentName, DependencyMaskConvertible | undefined> = new Map;
	
	constructor(store: Store | null, private _parent?: ModelView) {
		this._store = store != null ? store : new NullStore;
	}

	get typeValue(): ModelType | undefined {
		if (this._typeValue !== undefined) {
			return this._typeValue;
		} else {
			const fieldName = this[Model$type];
			const fieldDeps = this.getDependencyMask([fieldName]);
			if (fieldDeps !== undefined && fieldDeps.equals([]))
				return this.wrap({}).get(fieldName) as ModelType;
		}
	}

	set typeValue(value: ModelType | undefined) {
		this._typeValue = value;
	}

	find(id: InstanceId, options?: FindOptions): MaybePromise<Instance | null>;
	find(filter?: InstanceFilter, options?: FindOptions): MaybePromise<Instance[]>;
	find(idOrFilter?: InstanceId | InstanceFilter, options: FindOptions = {}): MaybePromise<Instance | Instance[] | null> {
		if (idOrFilter != null && typeof idOrFilter !== 'object') {
			const self = this;
			return maybeAsync(function *() {
				const results = yield self.find({ id: idOrFilter }, options);
				return results.length > 0 ? results[0] : null;
			});
		} else {
			const self = this;
			return maybeAsync(function* () {
				const filter = self.translateData(idOrFilter || {});
				const findOptions = translateFindOptions(self, options);
				const results = yield self._store.find(filter, findOptions);
				const wrapper = options.select == null ? self : self.select(options.select);
				return results.map((item: InstanceData) => {
					const instance = wrapper.wrap(item);
					return instance.sink(), instance;
				});
			});
		}
	}

	has(name: DependentName): boolean {
		if (this._dependents.has(name)) return true;
		if (this._parent != null && this._parent.has(name)) return true;
		return false;
	}

	addField(name: FieldName, fdc: FieldDescriptorConvertible): boolean {
		if (this.has(name)) return false;
		const descriptor = intoFieldDescriptor(name, fdc);
		this._dependents.set(name, descriptor.requires);
		this._fields.set(name, descriptor);
		return true;
	}

	queryField(name: FieldName): FieldInformation | undefined {
		const descriptor = this._fields.get(name);
		if (descriptor === undefined) return undefined;
		return {
			readable: descriptor.get != null,
			writable: descriptor.set != null,
		};
	}

	createInstance(): Instance {
		return this.wrap({});
	}

	wrap(data: InstanceData): Instance {
		return new Instance(this, this._store, data);
	}

	fields(selected?: FieldMaskConvertible): FieldName[] {
		const fieldMask = Mask.from(selected || {});
		const fields = this._parent != null
			? this._parent.fields(fieldMask) : [];
		for (const name of this._fields.keys()) {
			if (fieldMask.includes(name))
				fields.push(name);
		}
		return fields;
	}

	getFieldValue(instance: Instance, data: InstanceData, name: FieldName): MaybePromise<FieldValue> | undefined {
		const descriptor = this._fields.get(name);
		if (descriptor !== undefined) {
			if (descriptor.get == null) return undefined;
			if (descriptor.requires != undefined)
				data = Mask.from(descriptor.requires).apply(data);
			return descriptor.get.call(instance, data);
		} else if (this._parent != null) {
			return this._parent.getFieldValue(instance, data, name);
		}
	}

	setFieldValue(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<void> {
		const descriptor = this._fields.get(name);
		if (descriptor !== undefined) {
			if (descriptor.set == null) return undefined;
			return descriptor.set.call(instance, data, value);
		} else if (this._parent != null) {
			return this._parent.setFieldValue(instance, data, name, value);
		}
	}

	validateField(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<ValidationResult> | undefined {
		const descriptor = this._fields.get(name);
		if (descriptor !== undefined) {
			return maybeAsync(function* () {
				const result = new ValidationResult;
				if (descriptor.validators != null) {
					for (const validate of descriptor.validators)
						result.merge(yield validate.call(instance, name, value));
				}
				return result;
			});
		} else if (this._parent != null) {
			return this._parent.validateField(instance, data, name, value);
		}
	}

	getDependencyMask(selected?: DependentMaskConvertible): DependencyMask | undefined {
		let propertyMask: DependencyMask = Mask.from([]);
		const selectedMask = Mask.from(selected || {});
		for (const [name, deps] of this._dependents) {
			if (!selectedMask.includes(name)) continue;
			if (deps == null) return undefined;
			propertyMask = propertyMask.join(deps);
		}
		return propertyMask;
	}

	select(selected: DependentMaskConvertible): ModelView {
		return new MaskedModel(this, Mask.from(selected));
	}

	translateData(entries: InstanceEntries): InstanceData | undefined {
		const data: InstanceData = {};
		for (const name of Object.keys(entries)) {
			const value = entries[name];
			if (value === undefined) continue;
			const descriptor = this._fields.get(name);
			if (descriptor === undefined) continue;
			if (descriptor.translate == null) return undefined;
			descriptor.translate(data, value);
		}
		return data;
	}
}

function translateFindOptions(model: Model, options: FindOptions = {}): FindOptions {
	const select = model.getDependencyMask(options.select || {});
	const ordering = model.translateData(options.ordering || {});
	return { ...options, select, ordering } as FindOptions;
}

function isFieldDescriptor(x: any): x is FieldDescriptor {
	return typeof x === 'object' && (x.get != undefined || x.set != undefined);
}

function isAliasFieldDescriptor(x: any): x is AliasFieldDescriptor {
	return typeof x === 'object' && !isFieldDescriptor(x);
}

function isIntoFieldDescriptor(x: any): x is IntoFieldDescriptor {
	return typeof x === 'object' && typeof x.intoFieldDescriptor == 'function';
}

function fieldDescriptorFromValue(value: FieldValue): FieldDescriptor {
	return { get: () => value, requires: [] };
}

function fieldDescriptorFromAlias(name: FieldName, alias: AliasFieldDescriptor): FieldDescriptor {
	const propertyName = alias.property != null ? alias.property : name;
	const descriptor: FieldDescriptor = { requires: [propertyName] };

	if (alias.readable !== false) {
		descriptor.get = data => {
			const value = data[propertyName];
			if (value == null)
				return alias.default;
			return value;
		};
	}
	
	if (alias.writable !== false) {
		descriptor.set = (data, value) => {
			data[propertyName] = value;
		};
	}

	if (!!alias.readable && !!alias.writable) {
		descriptor.translate = (data, value) => {
			data[propertyName] = value;
		};
	}

	if (alias.validators != null)
		descriptor.validators = alias.validators;
	
	return descriptor;
}

function intoFieldDescriptor(name: FieldName, value: FieldDescriptorConvertible): FieldDescriptor {
	if (isFieldDescriptor(value))
		return value as FieldDescriptor;
	if (isIntoFieldDescriptor(value))
		return value.intoFieldDescriptor();
	if (isAliasFieldDescriptor(value))
		return fieldDescriptorFromAlias(name, value);
	return fieldDescriptorFromValue(value);
}