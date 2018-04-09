const chai = require('chai');
const sinon = require('sinon');

const {expect} = chai;
chai.use(require('sinon-chai'));

const apioid = require('..');
const {MemoryStore} = apioid.stores;
const {Model, Instance, ValidationResult} = apioid;

describe('Model', function () {
	describe('typeValue', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('returns value if not undefined', function () {
			this.model.typeValue = 'foo';
			expect(this.model.typeValue).to.equal('foo');
		});

		it('returns field value if undefined and type field has no dependencies', function () {
			this.model[Model.type] = 'type';
			const getType = sinon.stub().returns('foo');
			this.model.addField('type', { requires: [], get: getType });
			expect(this.model.typeValue).to.equal('foo');
			expect(getType).to.have.been.called;
		});

		it('returns undefined if undefined and type field has dependencies', function () {
			this.model[Model.type] = 'type';
			const getType = sinon.stub().returns('foo');
			this.model.addField('type', { requires: ['_type'], get: getType });
			expect(this.model.typeValue).to.be.undefined;
			expect(getType).not.to.have.been.called;
		});
	});

	describe('find', function () {
		beforeEach(function () {
			this.store = new MemoryStore;
			this.model = new Model(this.store);
			this.model.addField('id', {
				property: '_id',
			});
		});

		it('returns null when called with id of instance not in store', function () {
			const instance = this.model.find(1);
			expect(instance).not.to.exist;
		});

		it('returns instance of given model when called with instance id', function () {
			this.store.insert({ _id: 1 });
			const instance = this.model.find(1);
			expect(instance).to.be.an.instanceOf(Instance);
			expect(instance.model).to.equal(this.model);
		});

		it('returns empty array when called with filter and no items are found', function () {
			const results = this.model.find({});
			expect(results).to.be.empty;
		});

		it('returns array of instances of given model when called with filter', function () {
			this.store.insert([{ _id: 1 }, { _id: 2 }]);
			const results = this.model.find({});
			expect(results).to.have.length(2);
		});

		it('sinks instances returned from store', function () {
			this.store.insert({ _id: 1 });
			const instance = this.model.find(1);
			expect(instance.isFloating).to.be.false;
		});
	});

	describe('has', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', {});
		});

		it('returns true if field is present in model', function () {
			const hasDependent = this.model.has('foo');
			expect(hasDependent).to.be.true;
		});

		it('returns true if field is present in any parent model', function () {
			const childModel = new Model(null, this.model);
			const hasDependent = childModel.has('foo');
			expect(hasDependent).to.be.true;
		});
	});

	describe('addField', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('returns true if field does not exist yet', function () {
			const fieldAdded = this.model.addField('foo', {});
			expect(fieldAdded).to.be.true;
		});

		it('returns false if field already exists in model', function () {
			this.model.addField('foo', {});
			const fieldAdded = this.model.addField('foo', {});
			expect(fieldAdded).to.be.false;
		});

		it('returns false if field already exists in any parent model', function () {
			this.model.addField('foo', {});
			const childModel = new Model(null, this.model);
			const fieldAdded = childModel.addField('foo', {});
			expect(fieldAdded).to.be.false;
		});

		it('creates field when called with descriptor object', function () {
			const getFoo = sinon.stub().returns(123);
			this.model.addField('foo', { get: getFoo });
			const instance = this.model.createInstance();
			const value = instance.get('foo');
			expect(getFoo).to.have.been.called;
			expect(value).to.equal(123);
		});

		it('creates field alias when called with non-descriptor object', function () {
			this.model.addField('foo', {});
			const instance = this.model.wrap({ foo: 123 });
			const value = instance.get('foo');
			expect(value).to.equal(123);
		});

		it('creates field when called with descriptor convertible object', function () {
			const getFoo = sinon.stub().returns(123);
			this.model.addField('foo', { intoFieldDescriptor: () => ({ get: getFoo }) });
			const instance = this.model.createInstance();
			const value = instance.get('foo');
			expect(getFoo).to.have.been.called;
			expect(value).to.equal(123);
		});

		it('creates field returning value when called with non-object', function () {
			this.model.addField('foo', 123);
			const instance = this.model.createInstance();
			const value = instance.get('foo');
			expect(value).to.equal(123);
		});
	});

	describe('fields', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('returns field names in model', function () {
			this.model.addField('foo', {});
			const fields = this.model.fields();
			expect(fields).to.include('foo');
		});

		it('returns field names in parent models', function () {
			this.model.addField('foo', {});
			const childModel = new Model(null, this.model);
			const fields = childModel.fields();
			expect(fields).to.include('foo');
		});

		it('returns all field names included in field mask', function () {
			this.model.addField('foo', {});
			const fields = this.model.fields(['foo']);
			expect(fields).to.include('foo');
		});

		it('omits all field names not included in field mask', function () {
			this.model.addField('foo', {});
			const fields = this.model.fields([]);
			expect(fields).not.to.include('foo');
		});
	});

	describe('queryField', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('returns undefined if field does not exist in model', function () {
			const info = this.model.queryField('foo');
			expect(info).to.be.undefined;
		});

		it('returns field info if field exists in parent model', function () {
			this.model.addField('foo', {});
			const childModel = new Model(null, this.model);
			const info = this.model.queryField('foo');
			expect(info).to.exist;
		});

		it('sets readable to true if field has get handler', function () {
			this.model.addField('foo', 123);
			const {readable} = this.model.queryField('foo');
			expect(readable).to.be.true;
		});

		it('sets readable to false if field has no get handler', function () {
			this.model.addField('foo', { set: () => {} });
			const {readable} = this.model.queryField('foo');
			expect(readable).to.be.false;
		});

		it('sets writable to true if field has set handler', function () {
			this.model.addField('foo', { set: () => {} });
			const {writable} = this.model.queryField('foo');
			expect(writable).to.be.true;
		});

		it('sets writable to false if field has no set handler', function () {
			this.model.addField('foo', 123);
			const {writable} = this.model.queryField('foo');
			expect(writable).to.be.false;
		});
	});

	describe('wrap', function () {
		before(function () {
			this.model = new Model(null);
		});

		it('returns model instance', function () {
			const instance = this.model.wrap({});
			expect(instance).to.be.an.instanceof(Instance);
			expect(instance.model).to.equal(this.model);
		});
	});

	describe('createInstance', function () {
		before(function () {
			this.model = new Model(null);
		});

		it('returns model instance', function () {
			const instance = this.model.createInstance();
			expect(instance).to.be.an.instanceof(Instance);
			expect(instance.model).to.equal(this.model);
		});
	});

	describe('getFieldValue', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('calls get handler on instance with instance data', function () {
			const getFoo = sinon.stub().returns(123);
			this.model.addField('foo', { get: getFoo });
			
			const data = {};
			const instance = this.model.wrap(data);
			const value = this.model.getFieldValue(instance, data, 'foo');
			expect(getFoo).to.have.been.calledOn(instance);
			expect(getFoo).to.have.been.calledWith(data);
			expect(value).to.equal(123);
		});

		it('calls get handler found in parent models', function () {
			const getFoo = sinon.stub();
			this.model.addField('foo', { get: getFoo });
			
			const data = {};
			const childModel = new Model(null, this.model);
			const instance = childModel.wrap(data);
			childModel.getFieldValue(instance, data, 'foo');
			expect(getFoo).to.have.been.called;
		});
	});

	describe('setFieldValue', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('calls set handler on instance with instance data and value', function () {
			const setFoo = sinon.stub();
			this.model.addField('foo', { set: setFoo });

			const data = {};
			const instance = this.model.wrap(data);
			this.model.setFieldValue(instance, data, 'foo', 123);
			expect(setFoo).to.have.been.calledOn(instance);
			expect(setFoo).to.have.been.calledWith(data, 123);
		});

		it('calls set handler found in parent models', function () {
			const setFoo = sinon.stub();
			this.model.addField('foo', { set: setFoo });
			
			const data = {};
			const childModel = new Model(null, this.model);
			const instance = childModel.wrap(data);
			childModel.setFieldValue(instance, data, 'foo', 123);
			expect(setFoo).to.have.been.called;
		});
	});

	describe('validateField', function () {
		before(function () {
			this.setFoo = sinon.spy();
			this.model = new Model(null);
			this.validateFoo = sinon.stub();
			this.model.addField('foo', {
				set: this.setFoo,
				validators: [this.validateFoo],
			});
		});

		afterEach(function () {
			this.setFoo.resetHistory();
			this.validateFoo.resetHistory();
		});

		it('calls field validators on instance with field name and value', function () {
			this.validateFoo.returns(new ValidationResult);

			const data = {};
			const instance = this.model.wrap(data);
			const result = this.model.validateField(instance, data, 'foo', 123);
			expect(this.validateFoo).to.have.been.calledWith('foo', 123);
			expect(this.validateFoo).to.have.been.calledOn(instance);
		});

		it('calls field validators of fields found in parent model', function () {
			this.validateFoo.returns(new ValidationResult);

			const data = {};
			const childModel = new Model(null, this.model);
			const instance = childModel.wrap(data);
			childModel.validateField(instance, data, 'foo', 123);
			expect(this.validateFoo).to.have.been.called;
		});

		it('returns undefined if field was not found', function () {
			this.validateFoo.returns(new ValidationResult);

			const data = {};
			const instance = this.model.wrap(data);
			const result = this.model.validateField(instance, data, 'bar', 123);
			expect(this.validateFoo).not.to.have.been.called;
			expect(result).to.be.undefined;
		});
	});

	describe('getDependencyMask', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('returns mask with all properties required by given fields', function () {
			this.model.addField('foo', { get: () => {}, requires: ['bar'] });
			const dependencies = this.model.getDependencyMask(['foo']);
			expect(dependencies.includes('bar')).to.be.true;
		});

		it('returns undefined if any field doesn\'t specify its required properties', function () {
			this.model.addField('foo', { get: () => 123 });
			const dependencies = this.model.getDependencyMask(['foo']);
			expect(dependencies).to.be.undefined;
		});
	});

	describe('translateData', function () {
		beforeEach(function () {
			this.model = new Model(null);
		});

		it('calls field translate handler with result object and value', function () {
			const translateFoo = sinon.stub();
			this.model.addField('foo', { get: () => 123, translate: translateFoo });
			const data = this.model.translateData({ foo: 123 });
			expect(translateFoo).to.have.been.calledWith(data, 123);
		});

		it('returns undefined if field has no translate handler', function () {
			this.model.addField('foo', { get: () => 123 });
			const data = this.model.translateData({ foo: 123 });
			expect(data).to.be.undefined;
		});

		it('ignores unknown fields', function () {
			const translateFoo = sinon.stub();
			this.model.addField('foo', { get: () => 123, translate: translateFoo });
			const data = this.model.translateData({ foo: 123, bar: 456 });
			expect(data).to.exist;
		});
	});

	describe('select', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', {});
			this.model.addField('bar', {});
		});

		it('returns model view with fields in field mask', function () {
			const modelView = this.model.select(['foo']);
			expect(modelView.has('foo')).to.be.true;
			expect(modelView.has('bar')).to.be.false;
		});
	});
});