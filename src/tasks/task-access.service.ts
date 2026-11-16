import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TaskRole } from './task-response';
import { TaskCollaborator } from '../collaboration/task-collaborator.entity';
import { Task } from './task.entity';

@Injectable()
export class TaskAccessService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,

    @InjectRepository(TaskCollaborator)
    private readonly collaboratorsRepository: Repository<TaskCollaborator>,
  ) {}

  async getAccessible(
    taskId: number,
    userId: number,
  ): Promise<{ task: Task; role: TaskRole }> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: { owner: true },
    });

    if (!task) {
      throw this.taskNotFound(taskId);
    }

    if (task.ownerId === userId) {
      return { task, role: 'owner' };
    }

    const isCollaborator = await this.collaboratorsRepository.existsBy({
      taskId,
      userId,
    });

    if (isCollaborator) {
      return { task, role: 'collaborator' };
    }

    throw this.taskNotFound(taskId);
  }

  async getOwned(taskId: number, userId: number): Promise<Task> {
    const { task, role } = await this.getAccessible(taskId, userId);

    if (role !== 'owner') {
      throw new ForbiddenException({
        code: 'OWNER_ONLY',
        message: 'Only the task owner can perform this action',
      });
    }

    return task;
  }

  private taskNotFound(id: number): NotFoundException {
    return new NotFoundException({
      code: 'TASK_NOT_FOUND',
      message: `Task ${id} was not found`,
    });
  }
}
