import {maybeAsync, MaybePromise} from 'maybe-async';

import {
	Model$type, Model$id, ModelType, ModelView, DependentMask, FieldName, FieldValue,
	FieldMask, FieldMaskConvertible, DependencyMask, DependentMaskConvertible,
	FieldInformation, InstanceId, InstanceFilter,
} from './modelView';

import {FindOptions} from './store';
import {ValidationResult} from './validation';
import {Instance, InstanceData, InstanceEntries} from './instance';

export class MaskedModel implements ModelView {
	constructor(private _model: ModelView, private _selected: DependentMask) {
	}
	
	get [Model$type](): FieldName {
		return this._model[Model$type];
	}

	get [Model$id](): FieldName {
		return this._model[Model$id];
	}

	get typeValue(): ModelType | undefined {
		return this._model.typeValue;
	}

	find(id: InstanceId, options?: FindOptions): MaybePromise<Instance | null>;
	find(filter?: InstanceFilter, options?: FindOptions): MaybePromise<Instance[]>;
	find(idOrFilter?: InstanceId | InstanceFilter, options: FindOptions = {}): MaybePromise<Instance | Instance[] | null> {
		if (typeof idOrFilter !== 'object') {
			const self = this;
			return maybeAsync(function* () {
				const result = yield self._model.find(idOrFilter, options);
				return result ? self._model.wrap(result) : null;
			});
		} else {
			const self = this;
			return maybeAsync(function* () {
				const results = yield self._model.find(idOrFilter, options);
				return results.map((item: InstanceData) => self._model.wrap(item));
			});
		}
	}

	has(name: FieldName): boolean {
		return this._selected.includes(name) && this._model.has(name);
	}

	wrap(data: InstanceData): Instance {
		return this._model.wrap(data).rebind(this);
	}
	
	fields(selected?: FieldMaskConvertible): FieldName[] {
		return this._model.fields(this._selected.intersect(selected || {}));
	}

	queryField(name: FieldName): FieldInformation | undefined {
		if (!this._selected.includes(name)) return undefined;
		return this._model.queryField(name);
	}
	
	getFieldValue(instance: Instance, data: InstanceData, name: FieldName): MaybePromise<FieldValue> | undefined {
		if (!this._selected.includes(name)) return undefined;

		const dependencyMask = this.getDependencyMask([name]);
		if (dependencyMask != undefined) {
			const maskedData = dependencyMask.apply(data);
			for (const name of Object.keys(maskedData)) {
				if (maskedData[name] === undefined)
					return undefined;
			}
		}
		
		return this._model.getFieldValue(instance, data, name);
	}
	
	setFieldValue(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<void> {
		if (!this._selected.includes(name)) return undefined;
		return this._model.setFieldValue(instance, data, name, value);
	}

	validateField(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<ValidationResult> | undefined {
		if (!this._selected.includes(name)) return undefined;
		return this._model.validateField(instance, data, name, value);
	}

	getDependencyMask(selected?: DependentMaskConvertible): DependencyMask | undefined {
		return this._model.getDependencyMask(this._selected.intersect(selected || {}));
	}

	translateData(entries: InstanceEntries): InstanceData | undefined {
		return this._model.translateData(this._selected.apply(entries));
	}
	
	select(selected: DependentMask): ModelView {
		return new MaskedModel(this._model, this._selected.intersect(selected));
	}
}