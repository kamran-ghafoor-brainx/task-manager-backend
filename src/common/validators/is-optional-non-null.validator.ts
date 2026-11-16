import { ValidateIf, type ValidationOptions } from 'class-validator';

export function IsOptionalNonNull(validationOptions?: ValidationOptions) {
  return ValidateIf(
    (_object: object, value: unknown) => value !== undefined,
    validationOptions,
  );
}
