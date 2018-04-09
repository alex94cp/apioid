import {maybeAsync, MaybePromise} from 'maybe-async';

import {Store, PropertyName} from './store';
import {ValidationResult} from './validation';

import {
	Model$id, ModelView, FieldMaskConvertible, FieldName, FieldValue,
} from './modelView';

export {FieldName, PropertyName, FieldValue};

export type InstanceData = Record<PropertyName, FieldValue>;
export type InstanceEntries = Record<FieldName, FieldValue>;

export class Instance {
	private _isFloating: boolean = true;
	private _original: InstanceData;

	constructor(public model: ModelView, private _store: Store, private _data: InstanceData) {
		this._original = { ..._data };
	}

	get isFloating(): boolean {
		return this._isFloating;
	}

	rebind(modelView: ModelView): Instance {
		return new Instance(modelView, this._store, this._data);
	}

	select(fieldMask: FieldMaskConvertible): Instance {
		const modelView = this.model.select(fieldMask);
		return this.rebind(modelView);
	}

	isModified(): boolean;
	isModified(name: FieldName): boolean;
	isModified(fieldMask: FieldMaskConvertible): boolean;
	isModified(nameOrFieldMask?: FieldName | FieldMaskConvertible): boolean {
		if (typeof nameOrFieldMask !== 'string') {
			const fields = this.model.fields(nameOrFieldMask);
			return fields.some(f => this.isModified(f));
		} else {
			return this._data[nameOrFieldMask] === this._original[nameOrFieldMask];
		}
	}

	getOriginal(): Instance;
	getOriginal(name: FieldName): MaybePromise<FieldValue> | undefined;
	getOriginal(fieldMask: FieldMaskConvertible): MaybePromise<InstanceEntries>;
	getOriginal(nameOrFieldMask?: FieldName | FieldMaskConvertible): Instance
	                                                               | MaybePromise<InstanceEntries>
	                                                               | MaybePromise<FieldValue> | undefined {
		if (nameOrFieldMask === undefined) {
			return this.model.wrap(this._original);
		} else if (typeof nameOrFieldMask !== 'string') {
			const self = this;
			return maybeAsync(function* () {
				const result: InstanceEntries = {};
				const fields = self.model.fields(nameOrFieldMask);
				for (const name of fields) {
					const value = yield self.getOriginal(name);
					if (value !== undefined)
						result[name] = value;
				}
				return result;
			});
		} else {
			return this.model.getFieldValue(this, this._original, nameOrFieldMask);
		}
	}

	get(name: FieldName): MaybePromise<FieldValue> | undefined;
	get(fieldMask: FieldMaskConvertible): MaybePromise<InstanceEntries>;
	get(nameOrFieldMask: FieldName | FieldMaskConvertible): MaybePromise<FieldValue | InstanceEntries> | undefined {
		if (typeof nameOrFieldMask !== 'string') {
			const self = this;
			return maybeAsync(function* () {
				const result: InstanceEntries = {};
				const fields = self.model.fields(nameOrFieldMask);
				for (const name of fields) {
					const value = yield self.get(name);
					if (value !== undefined)
						result[name] = value;
				}
				return result;
			});
		} else {
			return this.model.getFieldValue(this, this._data, nameOrFieldMask);
		}
	}

	set(entries: InstanceEntries): MaybePromise<void>;
	set(name: FieldName, value: FieldValue): MaybePromise<void>;
	set(nameOrEntries: FieldName | InstanceEntries, value?: FieldValue): MaybePromise<void> {
		if (typeof nameOrEntries !== 'string') {
			const self = this;
			return maybeAsync(function* () {
				for (const name of Object.keys(nameOrEntries)) {
					const value = nameOrEntries[name];
					if (value !== undefined)
						yield self.set(name, value);
				}
			});
		} else if (value !== undefined) {
			const self = this;
			return maybeAsync(function* () {
				const validationResult = yield self.validate(nameOrEntries, value);
				if (validationResult.hasErrors()) throw validationResult;
				return self.model.setFieldValue(self, self._data, nameOrEntries, value);
			});
		}
	}

	disableValidation(): void {
		this.validate = () => new ValidationResult;
	}

	restoreValidation(): void {
		delete this.validate;
	}

	validate(): MaybePromise<ValidationResult>;
	validate(entries: InstanceEntries): MaybePromise<ValidationResult>;
	validate(name: FieldName, value: FieldValue): MaybePromise<ValidationResult> | undefined;
	validate(nameOrEntries?: FieldName | InstanceEntries, value?: FieldValue): MaybePromise<ValidationResult> | undefined {
		if (nameOrEntries == null) {
			const self = this;
			return maybeAsync(function* () {
				const result = new ValidationResult;
				for (const name of self.model.fields()) {
					const value = self.get(name);
					if (value !== undefined)
						result.merge(yield self.validate(name, value));
				}
				return result;
			});
		} else if (typeof nameOrEntries != 'string') {
			const self = this;
			return maybeAsync(function* () {
				const result = new ValidationResult;
				for (const name of Object.keys(nameOrEntries)) {
					const value = nameOrEntries[name];
					if (value !== undefined)
						result.merge(yield self.validate(name, value));
				}
				return result;
			});
		} else if (value !== undefined) {
			return this.model.validateField(this, this._data, nameOrEntries, value);
		}
	}

	sink(setSinkFlag: boolean = true): void {
		this._original = { ...this._data };
		this._isFloating = !setSinkFlag;
	}

	save(): MaybePromise<void> {
		if (this.isFloating) {
			const self = this;
			return maybeAsync(function* () {
				const instanceValidation = yield self.validate();
				if (!instanceValidation.hasErrors()) {
					const {insertedCount} = yield self._store.insert(self._data);
					if (insertedCount === 1) self.sink();
				}
			});
		} else {
			const idField = (this.model as any)[Model$id];
			const idMask = this.model.getDependencyMask([idField]);
			if (idMask !== undefined) {
				const self = this;
				return maybeAsync(function* () {
					const instanceValidation = yield self.validate();
					if (!instanceValidation.hasErrors()) {
						const filter = idMask.apply(self._data);
						const {modifiedCount} = yield self._store.update(filter, self._data);
						if (modifiedCount === 1) self.sink();
					}
				});
			}
		}
	}

	delete(): MaybePromise<void> {
		if (!this.isFloating) {
			const idField = (this.model as any)[Model$id];
			const idMask = this.model.getDependencyMask(['id']);
			if (idMask !== undefined) {
				const self = this;
				const filter = idMask.apply(self._data);
				return maybeAsync(function* () {
					const {deletedCount} = yield self._store.delete(filter, { multi: false });
					if (deletedCount === 1) self.sink(false);
				});
			}
		}
	}
}