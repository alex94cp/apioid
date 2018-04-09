const {expect} = require('chai');

const {validators} = require('..');

describe('validators', function () {
	describe('required', function () {
		it('returns result with no errors if value is not null', function () {
			const result = validators.required('foo', 123);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is null', function () {
			const result = validators.required('foo', null);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('typeOf', function () {
		it('returns result with no errors if typeof value matches', function () {
			const result = validators.typeOf('string')('foo', 'abc');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if typeof value does not match', function () {
			const result = validators.typeOf('string')('foo', 123);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('instanceOf', function () {
		it('returns result with no errors if instanceof value matches', function () {
			const result = validators.instanceOf(Date)('foo', new Date);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if instanceof value does not match', function () {
			const result = validators.instanceOf(Date)('foo', 123);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('eq', function () {
		it('returns result with no errors if value matches', function () {
			const result = validators.eq(123)('foo', 123);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value does not match', function () {
			const result = validators.eq(123)('foo', 456);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('ne', function () {
		it('returns result with no errors if value does not match', function () {
			const result = validators.ne(123)('foo', 456);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value matches', function () {
			const result = validators.ne(123)('foo', 123);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('gt', function () {
		it('returns result with no errors if value is greater than parameter', function () {
			const result = validators.gt(9000)('foo', 12000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is equal to parameter', function () {
			const result = validators.gt(9000)('foo', 9000);
			expect(result.hasErrors()).to.be.true;
		});

		it('returns result with errors if value is less than parameter', function () {
			const result = validators.gt(9000)('foo', 1000);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('ge', function () {
		it('returns result with no errors if value is greater than parameter', function () {
			const result = validators.ge(9000)('foo', 12000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with no errors if value is equal to parameter', function () {
			const result = validators.ge(9000)('foo', 9000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is less than parameter', function () {
			const result = validators.ge(9000)('foo', 1000);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('lt', function () {
		it('returns result with no errors if value is less than parameter', function () {
			const result = validators.lt(9000)('foo', 1000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is equal to parameter', function () {
			const result = validators.lt(9000)('foo', 9000);
			expect(result.hasErrors()).to.be.true;
		});

		it('returns result with errors if value is greater than parameter', function () {
			const result = validators.lt(9000)('foo', 12000);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('le', function () {
		it('returns result with no errors if value is less than parameter', function () {
			const result = validators.le(9000)('foo', 1000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with no errors if value is equal to parameter', function () {
			const result = validators.le(9000)('foo', 9000);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is greater than parameter', function () {
			const result = validators.le(9000)('foo', 12000);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('oneOf', function () {
		it('returns result with no errors if value is one of values given in parameter', function () {
			const result = validators.oneOf([1, 2, 3])('foo', 1);
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value is not one of values given in parameter', function () {
			const result = validators.oneOf([1, 2, 3])('foo', 5);
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('length', function () {
		it('returns result with no errors if value has length equal to parameter', function () {
			const result = validators.length(3)('foo', 'abc');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value has length not equal to parameter', function () {
			const result = validators.length(3)('foo', '12345');
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('minLength', function () {
		it('returns result with no errors if value has length greater than parameter', function () {
			const result = validators.minLength(5)('foo', '12345678');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with no errors if value has length equal to parameter', function () {
			const result = validators.minLength(5)('foo', '12345');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value has length less than parameter', function () {
			const result = validators.minLength(5)('foo', '123');
			expect(result.hasErrors()).to.be.true;
		});
	});

	describe('maxLength', function () {
		it('returns result with no errors if value has length less than parameter', function () {
			const result = validators.maxLength(5)('foo', '123');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with no errors if value has length equal to parameter', function () {
			const result = validators.maxLength(5)('foo', '12345');
			expect(result.hasErrors()).to.be.false;
		});

		it('returns result with errors if value has length greater than parameter', function () {
			const result = validators.maxLength(5)('foo', '12345678');
			expect(result.hasErrors()).to.be.true;
		});
	});
});