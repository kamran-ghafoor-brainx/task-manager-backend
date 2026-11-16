import { UnprocessableEntityException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

interface FieldError {
  field: string;
  message: string;
}

function flatten(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field: path,
      message,
    }));
    return [...own, ...flatten(error.children ?? [], path)];
  });
}

export function validationExceptionFactory(errors: ValidationError[]) {
  return new UnprocessableEntityException({
    code: 'VALIDATION_FAILED',
    message: 'Some fields are invalid',
    details: flatten(errors),
  });
}
