import query from 'sift';
import {v1 as uuid} from 'uuid';
import {FieldMask as Mask} from 'field-mask';

//@ts-ignore: Missing type definitions
import * as equals from 'equals';

//@ts-ignore: Missing type definitions
import * as orderby from 'sortby';

//@ts-ignore: Missing type definitions
import * as modify from 'modifyjs';

import {
	Store, ItemFilter, ItemData, UpdateParameter, FindOptions, InsertOptions,
	UpdateOptions, DeleteOptions, InsertResult, UpdateResult, DeleteResult, FindMask,
} from './store';

export class MemoryStore implements Store {
	private _items: ItemData[] = [];

	find(filter: ItemFilter = {}, options: FindOptions = {}): ItemData[] {
		const matchedItems = query(filter, this._items);
		return applyFindOptions(matchedItems, options);
	}

	insert(itemOrItems: ItemData | ItemData[], options: InsertOptions = {}): InsertResult {
		if (!Array.isArray(itemOrItems))
			return this.insert([itemOrItems], options);
		
		let insertedCount = 0;
		for (let item of itemOrItems) {
			if (item._id != null) {
				if (this.find({ _id: item._id }).length > 0)
					continue;
				item = { ...item };
			} else {
				item = { _id: uuid(), ...item };
			}
			this._items.push(item);
			++insertedCount;
		}

		return { insertedCount };
	}

	update(filter: ItemFilter, update: UpdateParameter, options: UpdateOptions = {}): UpdateResult {
		let matchedItems = query(filter, this._items);
		if (matchedItems.length > 1 && !options.multi)
			matchedItems.splice(1);
		
		let modifiedCount = 0;
		const matchedCount = matchedItems.length;
		for (const target of matchedItems) {
			const modified = modify(target, update);
			if (!equals(target, modified)) {
				Object.assign(target, modified);
				++modifiedCount;
			}
		}

		return { matchedCount, modifiedCount };
	}

	delete(filter: ItemFilter, options: DeleteOptions = {}): DeleteResult {
		if (options.multi == false) {
			const matchIndex = query.indexOf(filter, this._items);
			if (matchIndex == -1) return { deletedCount: 0 };
			this._items.splice(matchIndex, 1);
			return { deletedCount: 1 };
		} else {
			const unmatchedItems = query({ $not: filter }, this._items);
			const deletedCount = this._items.length - unmatchedItems.length;
			this._items = unmatchedItems;
			return { deletedCount };
		}
	}
}

function applyFindOptions(items: ItemData[], options: FindOptions): ItemData[] {
	if (options.ordering != null) items.sort(orderby(options.ordering))
	if (options.offset != null) items.splice(0, options.offset);
	if (options.limit != null) items.splice(options.limit);
	const findMask = Mask.from(options.select || {});
	return items.map(i => findMask.apply(i));
}