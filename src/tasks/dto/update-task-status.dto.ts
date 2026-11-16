import { IsIn } from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from '../../common/types';

export class UpdateTaskStatusDto {
  @IsIn(TASK_STATUSES, {
    message: 'status must be one of: todo, in_progress, done',
  })
  status!: TaskStatus;
}
