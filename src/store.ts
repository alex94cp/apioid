import {MaybePromise} from 'maybe-async';

import {
	FieldMask as Mask, FieldMaskConvertible as MaskConvertible
} from 'field-mask';

export type PropertyName = string;

export type ItemId = number | string;
export type ItemData = Record<PropertyName, any>;
export type ItemFilter = Record<PropertyName, any>;
export type UpdateParameter = Record<PropertyName, any>;

export type FindMask = Mask<PropertyName>;
export type FindOrdering = Record<PropertyName, -1 | 1>;
export type FindMaskConvertible = MaskConvertible<PropertyName>;

export interface FindOptions {
	limit?: number;
	offset?: number;
	ordering?: FindOrdering;
	select?: FindMaskConvertible;
}

export interface InsertOptions {
	ordered?: boolean;
}

export interface UpdateOptions {
	multi?: boolean;
}

export interface DeleteOptions {
	multi?: boolean;
}

export interface InsertResult {
	insertedCount: number;
}

export interface UpdateResult {
	matchedCount: number;
	modifiedCount: number;
}

export interface DeleteResult {
	deletedCount: number;
}

export interface Store {
	find(filter?: ItemFilter, options?: FindOptions): MaybePromise<ItemData[]>;
	insert(items: ItemData | ItemData[], options?: InsertOptions): MaybePromise<InsertResult>;
	update(filter: ItemFilter, update: UpdateParameter, options?: UpdateOptions): MaybePromise<UpdateResult>;
	delete(filter: ItemFilter, options?: DeleteOptions): MaybePromise<DeleteResult>;
}