import {FieldValidator} from './model';
import {ValidationResult} from './validation';
import {FieldName, FieldValue} from './modelView';

export interface HasInstance {
	[Symbol.hasInstance]: Function;
}

export function required(name: FieldName, value: FieldValue): ValidationResult {
	const result = new ValidationResult;
	if (value == null)
		result.addError(name, "Field can't be null");
	return result;
}

export function typeOf(t: string): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (typeof value !== t)
			result.addError(name, `Field must be of type "${t}"`);
		return result;
	};
}

export function instanceOf(ctor: HasInstance): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (!(value instanceof (ctor as any)))
			result.addError(name, `Field must be an instance of ${ctor}`);
		return result;
	};
}

export function eq(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value !== x)
			result.addError(name, `Field must equal to ${x}`);
		return result;
	};
}

export function ne(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value === x)
			result.addError(name, `Field must not be equal to ${x}`);
		return result;
	};
}

export function lt(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value >= x)
			result.addError(name, `Field must be less than ${x}`);
		return result;
	};
}

export function le(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value > x)
			result.addError(name, `Field must be less than or equal to ${x}`);
		return result;
	};
}

export function gt(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value <= x)
			result.addError(name, `Field must be greater than ${x}`);
		return result;
	};
}

export function ge(x: any): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (value != null && value < x)
			result.addError(name, `Field must be greater than or equal to ${x}`);
		return result;
	};
}

export function oneOf(values: any[]): FieldValidator {
	return (name, value) => {
		const result = new ValidationResult;
		if (values.indexOf(value) === -1)
			result.addError(name, `Field must be one of: ${values.join(', ')}`);
		return result;
	};
}

export function length(l: number): FieldValidator {
	return (name, value: any) => {
		const result = new ValidationResult;
		if (value != null && value.length != l)
			result.addError(name, `Field must be of length ${l}`);
		return result;
	};
}

export function minLength(min: number): FieldValidator {
	return (name, value: any) => {
		const result = new ValidationResult;
		if (value != null && value.length < min)
			result.addError(name, `Field must be of length ${min} or greater`);
		return result;
	};
}

export function maxLength(max: number): FieldValidator {
	return (name, value: any) => {
		const result = new ValidationResult;
		if (value != null && value.length > max)
			result.addError(name, `Field must be of length less than ${max}`);
		return result;
	};
}