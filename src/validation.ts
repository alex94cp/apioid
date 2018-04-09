import {FieldName} from './modelView';

export type ValidationError = string;

export class ValidationResult {
	private _errors: Map<FieldName, ValidationError[]> = new Map;

	hasErrors(name?: FieldName): boolean {
		return name != null ? this._errors.has(name)
		                    : this._errors.size > 0;
	}

	errors(): Iterable<[FieldName, ValidationError]>;
	errors(name: FieldName): Iterable<ValidationError>;
	*errors(name?: FieldName): Iterable<ValidationError | [FieldName, ValidationError]> {
		if (name != null) {
			const errorBag = this._errors.get(name);
			if (errorBag !== undefined) yield* errorBag;
		} else {
			for (const [name, errorBag] of this._errors)
				for (const err of errorBag) yield [name, err];
		}
	}
	
	addError(name: FieldName, err: ValidationError): void {
		let errorBag = this._errors.get(name);
		if (errorBag === undefined)
			this._errors.set(name, errorBag = []);
		errorBag.push(err);
	}

	merge(result: ValidationResult): void {
		for (const [name, err] of result.errors())
			this.addError(name, err);
	}
}