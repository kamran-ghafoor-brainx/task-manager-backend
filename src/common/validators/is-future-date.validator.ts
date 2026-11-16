import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return true;

          const date = new Date(value);

          if (isNaN(date.getTime())) return true;

          return date.getTime() > Date.now() + 60_000;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a date in the future`;
        },
      },
    });
  };
}
