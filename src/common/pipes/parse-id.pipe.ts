import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const isValid = /^\d{1,9}$/.test(value) && Number(value) > 0;

    if (!isValid) {
      throw new BadRequestException({
        code: 'INVALID_ID',
        message: 'id must be a positive whole number',
      });
    }

    return Number(value);
  }
}
