import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from '../../common/types';
import { trim } from '../../common/validation/transforms';

export class ListTasksQueryDto {
  @IsOptional()
  @IsIn(['all', 'owned', 'shared'], {
    message: 'scope must be all, owned, or shared',
  })
  scope: 'all' | 'owned' | 'shared' = 'all';

  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'status must be todo, in_progress, or done' })
  status?: TaskStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'search must be at most 100 characters' })
  search?: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'dueBefore must be a valid ISO 8601 date' },
  )
  dueBefore?: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'dueAfter must be a valid ISO 8601 date' },
  )
  dueAfter?: string;

  @IsOptional()
  @IsIn(['createdAt', 'deadline'], {
    message: 'sort must be createdAt or deadline',
  })
  sort: 'createdAt' | 'deadline' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'order must be asc or desc' })
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be a whole number' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be a whole number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit: number = 20;
}
