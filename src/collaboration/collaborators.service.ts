import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type CollaboratorRemovedEvent,
  NotificationEvents,
} from '../notifications/notification-events';
import { TaskAccessService } from '../tasks/task-access.service';
import { Task } from '../tasks/task.entity';
import { UsersService } from '../users/user.service';
import {
  CollaboratorResponse,
  toCollaboratorResponse,
} from './collaboration-response';
import { TaskCollaborator } from './task-collaborator.entity';

@Injectable()
export class CollaboratorsService {
  private readonly logger = new Logger(CollaboratorsService.name);

  constructor(
    @InjectRepository(TaskCollaborator)
    private readonly collaboratorsRepository: Repository<TaskCollaborator>,
    private readonly taskAccessService: TaskAccessService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(
    taskId: number,
    requesterId: number,
  ): Promise<CollaboratorResponse[]> {
    await this.taskAccessService.getAccessible(taskId, requesterId);

    const collaborators = await this.collaboratorsRepository.find({
      where: { taskId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    return collaborators.map(toCollaboratorResponse);
  }

  async remove(
    taskId: number,
    targetUserId: number,
    requesterId: number,
  ): Promise<void> {
    const { task, role } = await this.taskAccessService.getAccessible(
      taskId,
      requesterId,
    );

    if (role === 'collaborator' && targetUserId !== requesterId) {
      throw new ForbiddenException({
        code: 'OWNER_ONLY',
        message: 'Only the task owner can remove other collaborators',
      });
    }

    const result = await this.collaboratorsRepository.delete({
      taskId,
      userId: targetUserId,
    });

    if (result.affected === 0) {
      throw new NotFoundException({
        code: 'COLLABORATOR_NOT_FOUND',
        message: 'This user is not a collaborator on this task',
      });
    }

    await this.emitRemoved(task, targetUserId, requesterId);
  }

  private async emitRemoved(
    task: Task,
    removedUserId: number,
    requesterId: number,
  ): Promise<void> {
    try {
      const remover = await this.usersService.findById(requesterId);
      const event: CollaboratorRemovedEvent = {
        taskId: task.id,
        taskTitle: task.title,
        removedUserId,
        removedByName: remover?.name ?? 'Someone',
        removedByOwner: requesterId !== removedUserId,
      };
      this.eventEmitter.emit(NotificationEvents.CollaboratorRemoved, event);
    } catch (error) {
      this.logger.error(
        `Could not emit ${NotificationEvents.CollaboratorRemoved} for task ${task.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
