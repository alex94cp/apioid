const chai = require('chai');
const sinon = require('sinon');

const {expect} = chai;
chai.use(require('sinon-chai'));

const apioid = require('..');
const {MemoryStore} = apioid.stores;
const {Model, Instance, ValidationResult} = apioid;

describe('Instance', function () {
	describe('rebind', function () {
		before(function () {
			this.model = new Model(null);
		});

		it('returns instance from given model', function () {
			const modelView = this.model.select([]);
			const instance = this.model.createInstance();
			const instanceView = instance.rebind(modelView);
			expect(instanceView.model).to.equal(modelView);
		});
	});

	describe('select', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', 123);
			this.model.addField('bar', 456);
			this.instance = this.model.createInstance();
		});

		it('returns instance view with fields in field mask', function () {
			const instanceView = this.instance.select(['foo']);
			expect(instanceView).to.be.an.instanceof(Instance);
			expect(instanceView.get('foo')).to.equal(123);
			expect(instanceView.get('bar')).to.be.undefined;
		});
	});
	
	describe('get', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', 123);
			this.model.addField('bar', 456);
		});

		it('returns field value when called with field name', function () {
			const instance = this.model.createInstance();
			const value = instance.get('foo');
			expect(value).to.equal(123);
		});

		it('returns object with field values when called with field mask', function () {
			const instance = this.model.createInstance();
			const values = instance.get(['foo', 'bar']);
			expect(values).to.have.property('foo', 123);
			expect(values).to.have.property('bar', 456);
		});
	});

	describe('set', function () {
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

		it('sets field value when called with field name', function () {
			this.validateFoo.returns(new ValidationResult);
			
			const instance = this.model.createInstance();
			instance.set('foo', 123);
			expect(this.setFoo).to.have.been.called;
		});

		it('sets field values when called with object', function () {
			this.validateFoo.returns(new ValidationResult);

			const instance = this.model.createInstance();
			instance.set({ foo: 123 });
			expect(this.setFoo).to.have.been.called;
		});

		it('does not set fields with undefined values', function () {
			this.validateFoo.returns(new ValidationResult);

			const instance = this.model.createInstance();
			instance.set({ foo: undefined });
			expect(this.setFoo).not.to.have.been.called;
		});

		it('throws an error if field value is not valid', function () {
			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field is invalid');
			this.validateFoo.returns(validationResult);

			const instance = this.model.createInstance();
			expect(() => { instance.set('foo', 123); }).to.throw();
			expect(this.setFoo).not.to.have.been.called;
		});
	});

	describe('isModified', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', { property: '_foo' });
			this.model.addField('bar', { property: '_bar' });
		});

		beforeEach(function () {
			this.instance = this.model.wrap({ _foo: 123, _bar: 456 });
		});

		it('returns true when called with no arguments if any field was modified', function () {
			this.instance.set('foo', 321);
			const isModified = this.instance.isModified();
			expect(isModified).to.be.true;
		});

		it('returns true when called with field name if field was modified', function () {
			this.instance.set('foo', 321);
			const isModified = this.instance.isModified('foo');
			expect(isModified).to.be.true;
		});

		it('returns true when called with field mask if some included field was modified', function () {
			this.instance.set('foo', 321);
			const isModified = this.instance.isModified(['foo', 'bar']);
			expect(isModified).to.be.true;
		});
	});

	describe('getOriginal', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', { property: '_foo' });
			this.model.addField('bar', { property: '_bar' });
		});

		beforeEach(function () {
			this.instance = this.model.wrap({ _foo: 123, _bar: 456 });
			this.instance.set('foo', 321);
		});

		it('returns instance view with previous instance data', function () {
			const original = this.instance.getOriginal();
			expect(original).to.be.an.instanceof(Instance);
			const value = original.get('foo');
			expect(value).to.equal(123);
		});

		it('returns previous field value when called with field name', function () {
			const value = this.instance.getOriginal('foo');
			expect(value).to.equal(123);
		});

		it('returns object with original field values when called with field mask', function () {
			const values = this.instance.getOriginal(['foo', 'bar']);
			expect(values).to.have.property('foo', 123);
			expect(values).to.have.property('bar', 456);
		});
	});

	describe('validate', function () {
		before(function () {
			this.getFoo = sinon.stub();
			this.setFoo = sinon.stub();
			this.validateFoo = sinon.stub();
			this.model = new Model(null);
			this.model.addField('foo', {
				get: this.getFoo,
				set: this.setFoo,
				validators: [
					this.validateFoo,
				],
			});
		});

		afterEach(function () {
			this.getFoo.resetHistory();
			this.setFoo.resetHistory();
			this.validateFoo.resetHistory();
		});

		it('returns result with no errors when called with no arguments on instance in valid state', function () {
			this.getFoo.returns(123);
			this.validateFoo.returns(new ValidationResult);

			const instance = this.model.createInstance();
			const result = instance.validate();
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors when called with no arguments on instance in invalid state', function () {
			this.getFoo.returns(123);

			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field value is invalid');
			this.validateFoo.returns(validationResult);
			
			const instance = this.model.createInstance();
			const result = instance.validate();
			expect(result.hasErrors()).to.be.true;
		});

		it('returns result with no errors when called with valid data', function () {
			this.validateFoo.returns(new ValidationResult);

			const instance = this.model.createInstance();
			const result = instance.validate({ foo: 123 });
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors when called with invalid data', function () {
			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field value is invalid');
			this.validateFoo.returns(validationResult);

			const instance = this.model.createInstance();
			const result = instance.validate({ foo: 123 });
			expect(result.hasErrors()).to.be.true;
		});

		it('returns result with no errors when called with field name and valid value', function () {
			this.validateFoo.returns(new ValidationResult);

			const instance = this.model.createInstance();
			const result = instance.validate('foo', 123);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors when called with field name and invalid value', function () {
			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field value is invalid');
			this.validateFoo.returns(validationResult);

			const instance = this.model.createInstance();
			const result = instance.validate('foo', 123);
			expect(result.hasErrors()).to.be.true;
		});

		it('omits validation errors when instance validation is disabled', function () {
			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field value is invalid');
			this.validateFoo.returns(validationResult);

			const instance = this.model.createInstance();
			instance.disableValidation();
			const result = instance.validate('foo', 123);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns validation errors after instance validation is restored', function () {
			const validationResult = new ValidationResult;
			validationResult.addError('foo', 'Field value is invalid');
			this.validateFoo.returns(validationResult);

			const instance = this.model.createInstance();
			instance.disableValidation();
			instance.restoreValidation();
			const result = instance.validate('foo', 123);
			expect(result.hasErrors()).to.be.true;
		});
	});
	
	describe('sink', function () {
		before(function () {
			this.model = new Model(null);
			this.model.addField('foo', {});
		});

		it('sets instance floating state to false by default', function () {
			const instance = this.model.createInstance();
			instance.sink();
			expect(instance.isFloating).to.be.false;
		});

		it('sets modified instance state back to original state', function () {
			const instance = this.model.wrap({ foo: 123 });
			instance.set('foo', 456);
			instance.sink();
			const isModified = instance.isModified();
			expect(isModified).to.be.true;
		});

		it('sets instance floating state back to true when called with false', function () {
			const instance = this.model.createInstance();
			instance.sink();
			instance.sink(false);
			expect(instance.isFloating).to.be.true;
		});
	});

	describe('save', function () {
		beforeEach(function () {
			this.store = new MemoryStore;
			this.model = new Model(this.store);
			this.model.addField('foo', {});
			this.model.addField('id', {
				property: '_id',
			});
		});

		it('inserts instance data into store when called on floating instance', function () {
			const instance = this.model.createInstance();
			instance.save();
			const results = this.store.find();
			expect(results).to.have.length(1);
		});

		it('sinks instance when called on floating instance if insertion took place', function () {
			const instance = this.model.createInstance();
			instance.save();
			expect(instance.isFloating).to.be.false;
		});

		it('doesn\'t sink instance when called on floating instance if insertion didn\'t took place', function () {
			sinon.stub(this.store, 'insert').returns({ insertedCount: 0 });

			const instance = this.model.createInstance();
			instance.save();
			expect(instance.isFloating).to.be.true;
		});

		it('updates data on store with instance data when called on sinked instance', function () {
			this.store.insert({ _id: 1, foo: 123 });

			const instance = this.model.find(1);
			instance.set('foo', 456);
			instance.save();
			const results = this.store.find({ foo: 456 });
			expect(results).to.have.length(1);
		});
	});

	describe('delete', function () {
		beforeEach(function () {
			this.store = new MemoryStore;
			this.model = new Model(this.store);
			this.instance = this.model.createInstance();
			this.instance.save();
		});

		it('removes item from store when called on sinked instance', function () {
			this.instance.delete();
			const results = this.store.find();
			expect(results).to.be.empty;
		});

		it('floats instance when called on sinked instance if removal took place', function () {
			this.instance.delete();
			expect(this.instance.isFloating).to.be.true;
		});

		it('doesn\'t float instance when called on sinked instance if removal didn\'t took place', function () {
			sinon.stub(this.store, 'delete').returns({ deletedCount: 0 });

			this.instance.delete();
			expect(this.instance.isFloating).to.be.false;
		});
	});
});