import {
	Store, ItemData, ItemFilter, FindOptions, InsertOptions, InsertResult,
	UpdateOptions, UpdateParameter, UpdateResult, DeleteOptions, DeleteResult
} from './store';

export class NullStore implements Store {
	find(filter?: ItemFilter, options?: FindOptions): ItemData[] {
		return [];
	}

	insert(items: ItemData | ItemData[], options?: InsertOptions): InsertResult {
		return { insertedCount: 0 };
	}

	update(filter: ItemFilter, update: UpdateParameter, options?: UpdateOptions): UpdateResult {
		return { matchedCount: 0, modifiedCount: 0 };
	}

	delete(filter: ItemFilter, options?: DeleteOptions): DeleteResult {
		return { deletedCount: 0 };
	}
}