import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from '../../common/types';
import { trim } from '../../common/validation/transforms';
import { IsFutureDate } from '../../common/validators/is-future-date.validator';
import { IsOptionalNonNull } from '../../common/validators/is-optional-non-null.validator';

export class CreateTaskDto {
  @Transform(trim)
  @IsString({ message: 'title is required' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(200, { message: 'title must be at most 200 characters' })
  title!: string;

  @IsOptionalNonNull()
  @Transform(trim)
  @IsString()
  @MaxLength(5000, { message: 'description must be at most 5000 characters' })
  description?: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'deadlineAt must be a valid ISO 8601 date' },
  )
  @IsFutureDate({ message: 'deadlineAt must be a date in the future' })
  deadlineAt?: string | null;

  @IsOptionalNonNull()
  @IsIn(TASK_STATUSES, {
    message: 'status must be one of: todo, in_progress, done',
  })
  status?: TaskStatus;
}
