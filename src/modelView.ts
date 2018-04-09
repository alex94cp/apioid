import {MaybePromise} from 'maybe-async';

import {
	FieldMask as Mask, FieldMaskConvertible as MaskConvertible
} from 'field-mask';

import {ValidationResult} from './validation';
import {ItemId, PropertyName, FindOptions} from './store';
import {Instance, InstanceData, InstanceEntries} from './instance';

export type ModelType = string;
export type FieldName = string;
export type DependentName = string;

export type InstanceId = ItemId;
export type InstanceFilter = InstanceEntries;

export type FieldMask = Mask<FieldName>;
export type DependentMask = Mask<DependentName>;
export type DependencyMask = Mask<PropertyName>;

export type FieldMaskConvertible = MaskConvertible<FieldName>;
export type DependentMaskConvertible = MaskConvertible<DependentName>;

export type FieldValue = null | boolean | string | number | object | any[];

export interface FieldInformation {
	readable: boolean;
	writable: boolean;
}

export const Model$id = Symbol();
export const Model$type = Symbol();

export interface ModelView {
	typeValue?: ModelType;
	
	[Model$id]: FieldName;
	[Model$type]: FieldName;
	
	wrap(data: InstanceData): Instance;

	find(id: InstanceId, options?: FindOptions): MaybePromise<Instance | null>;
	find(filter?: InstanceFilter, options?: FindOptions): MaybePromise<Instance[]>;
	find(idOrFilter?: InstanceId | InstanceFilter, options?: FindOptions): MaybePromise<null | Instance | Instance[]>;

	has(name: DependentName): boolean;
	fields(selected?: FieldMaskConvertible): FieldName[];
	queryField(name: FieldName): FieldInformation | undefined;
	
	getFieldValue(instance: Instance, data: InstanceData, name: FieldName): MaybePromise<FieldValue> | undefined;
	setFieldValue(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<void>;
	validateField(instance: Instance, data: InstanceData, name: FieldName, value: FieldValue): MaybePromise<ValidationResult> | undefined;
	
	getDependencyMask(selected?: DependentMaskConvertible): DependencyMask | undefined;
	translateData(entries: InstanceEntries): InstanceData | undefined;
	
	select(selected: DependentMaskConvertible): ModelView;
}