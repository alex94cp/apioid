const {expect} = require('chai');

const apioid = require('..');
const {MemoryStore} = apioid.stores;

describe('MemoryStore', function () {
	beforeEach(function () {
		this.store = new MemoryStore;
	});

	describe('find', function () {
		beforeEach(function () {
			this.store.insert([{ foo: 1, bar: 1 }, { foo: 1, bar: 2 }]);
		});

		it('returns all items when called with no arguments', function () {
			const results = this.store.find();
			expect(results).to.have.length(2);
		});

		it('returns all items matching given filter', function () {
			const results = this.store.find({ foo: 1 });
			expect(results).to.have.length(2);
		});

		it('does not return items not matching given filter', function () {
			const results = this.store.find({ bar: 2 });
			expect(results).to.have.length(1);
		});

		it('returns only as many items as specified in limit param', function () {
			const results = this.store.find({}, { limit: 1 });
			expect(results).to.have.length(1);
		});

		it('skips as many items as specified in offset param', function () {
			const results = this.store.find({}, { offset: 1 });
			expect(results).to.have.length(1);
		});

		it('returns items with only fields specified in select param', function () {
			const results = this.store.find({}, { limit: 1, select: ['foo'] });
			expect(results[0]).to.have.property('foo');
			expect(results[0]).not.to.have.property('bar');
		});

		it('returns items sorted as specified in ordering param', function () {
			const results = this.store.find({}, { ordering: { bar: -1 } });
			expect(results[0]).to.have.property('bar', 2);
			expect(results[1]).to.have.property('bar', 1);
		});
	});

	describe('insert', function () {
		it('adds items to the store', function () {
			const result = this.store.insert({ foo: 123 });
			const items = this.store.find();
			expect(items).to.have.length(1);
		});

		it('adds _id field if item does not have _id field', function () {
			this.store.insert({});
			const items = this.store.find()[0];
			expect(items).to.have.property('_id');
		});

		it('doesn\'t add items with _id fields matching items in store', function () {
			this.store.insert({ _id: 1 });
			const result = this.store.insert({ _id: 1 });
			expect(result).to.have.property('insertedCount', 0);
		});
	});

	describe('update', function () {
		beforeEach(function () {
			this.store.insert([{ foo: 1, bar: 1 }, { foo: 1, bar: 2 }]);
		});

		it('updates only first item by default', function () {
			this.store.update({}, { bar: 3 });
			const results = this.store.find({ bar: 3 });
			expect(results).to.have.length(1);
		});

		it('updates all matching items if multi param is true', function () {
			this.store.update({}, { bar: 3 }, { multi: true });
			const results = this.store.find({ bar: 3 });
			expect(results).to.have.length(2);
		});
	});

	describe('delete', function () {
		beforeEach(function() {
			this.store.insert([{ foo: 1 }, { foo: 1 }]);
		});

		it('removes all matching items by default', function () {
			this.store.delete({ foo: 1 });
			const items = this.store.find();
			expect(items).to.be.empty;
		});

		it('removes only first matching item if multi param is false', function () {
			this.store.delete({ foo: 1 }, { multi: false });
			const items = this.store.find({});
			expect(items).to.have.length(1);
		});
	});
});