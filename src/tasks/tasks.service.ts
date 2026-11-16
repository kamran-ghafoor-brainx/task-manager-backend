import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TaskCollaborator } from '../collaboration/task-collaborator.entity';
import type { TaskStatus } from '../common/types';
import {
  NotificationEvents,
  type TaskDeletedEvent,
  type TaskStatusChangedEvent,
  type TaskUpdatedEvent,
} from '../notifications/notification-events';
import { UsersService } from '../users/user.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskAccessService } from './task-access.service';
import {
  PaginatedTasks,
  TaskResponse,
  TaskRole,
  toTaskResponse,
} from './task-response';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly taskAccessService: TaskAccessService,

    @InjectRepository(TaskCollaborator)
    private readonly collaboratorsRepository: Repository<TaskCollaborator>,

    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(ownerId: number, dto: CreateTaskDto): Promise<TaskResponse> {
    const task = this.tasksRepository.create({
      ownerId,
      title: dto.title,
      description: dto.description ?? '',
      deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
      status: 'todo',
      completedAt: null,
    });

    if (dto.status) {
      this.applyStatus(task, dto.status);
    }

    const saved = await this.tasksRepository.save(task);

    return this.findOne(saved.id, ownerId);
  }

  async findOne(taskId: number, userId: number): Promise<TaskResponse> {
    const { task, role } = await this.taskAccessService.getAccessible(
      taskId,
      userId,
    );
    task.collaboratorCount = await this.countCollaborators(task.id);
    return toTaskResponse(task, role);
  }

  async findAll(
    userId: number,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    const qb = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.owner', 'owner');

    this.applyScope(qb, userId, query.scope);
    this.applyFilters(qb, query);
    this.applySorting(qb, query);

    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [tasks, total] = await qb.getManyAndCount();

    await this.attachCollaboratorCounts(tasks);

    return {
      items: tasks.map((task: Task) =>
        toTaskResponse(task, this.roleOf(task, userId)),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async update(
    taskId: number,
    userId: number,
    dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    const task = await this.taskAccessService.getOwned(taskId, userId);

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.deadlineAt !== undefined) {
      task.deadlineAt = dto.deadlineAt ? new Date(dto.deadlineAt) : null;
    }
    if (dto.status !== undefined) {
      this.applyStatus(task, dto.status);
    }

    await this.tasksRepository.save(task);
    await this.emitTaskUpdated(task, userId);

    task.collaboratorCount = await this.countCollaborators(task.id);
    return toTaskResponse(task, 'owner');
  }

  async updateStatus(
    taskId: number,
    userId: number,
    newStatus: TaskStatus,
  ): Promise<TaskResponse> {
    const { task, role } = await this.taskAccessService.getAccessible(
      taskId,
      userId,
    );

    const changed = this.applyStatus(task, newStatus);
    if (changed) {
      await this.tasksRepository.save(task);
      await this.emitStatusChanged(task, userId);
    }

    task.collaboratorCount = await this.countCollaborators(task.id);
    return toTaskResponse(task, role);
  }

  async remove(taskId: number, userId: number): Promise<void> {
    const task = await this.taskAccessService.getOwned(taskId, userId);

    const deletedEvent = await this.buildTaskDeletedEvent(task, userId);

    await this.tasksRepository.delete({ id: taskId });

    if (deletedEvent) {
      this.eventEmitter.emit(NotificationEvents.TaskDeleted, deletedEvent);
    }
  }

  private async emitTaskUpdated(task: Task, actorId: number): Promise<void> {
    try {
      const event: TaskUpdatedEvent = {
        taskId: task.id,
        taskTitle: task.title,
        updatedByName: await this.nameOf(actorId),
        collaboratorIds: await this.collaboratorIdsOf(task.id),
      };
      this.eventEmitter.emit(NotificationEvents.TaskUpdated, event);
    } catch (error) {
      this.logEventError(NotificationEvents.TaskUpdated, task.id, error);
    }
  }

  private async emitStatusChanged(task: Task, actorId: number): Promise<void> {
    try {
      const collaboratorIds = await this.collaboratorIdsOf(task.id);
      const event: TaskStatusChangedEvent = {
        taskId: task.id,
        taskTitle: task.title,
        newStatus: task.status,
        changedByUserId: actorId,
        changedByName: await this.nameOf(actorId),
        notifyUserIds: [task.ownerId, ...collaboratorIds],
      };
      this.eventEmitter.emit(NotificationEvents.TaskStatusChanged, event);
    } catch (error) {
      this.logEventError(NotificationEvents.TaskStatusChanged, task.id, error);
    }
  }

  private async buildTaskDeletedEvent(
    task: Task,
    actorId: number,
  ): Promise<TaskDeletedEvent | null> {
    try {
      return {
        taskId: task.id,
        taskTitle: task.title,
        deletedByName: await this.nameOf(actorId),
        collaboratorIds: await this.collaboratorIdsOf(task.id),
      };
    } catch (error) {
      this.logEventError(NotificationEvents.TaskDeleted, task.id, error);
      return null;
    }
  }

  private async collaboratorIdsOf(taskId: number): Promise<number[]> {
    const collaborators = await this.collaboratorsRepository.find({
      where: { taskId },
      select: { userId: true },
    });
    return collaborators.map((collaborator) => collaborator.userId);
  }

  private async nameOf(userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    return user?.name ?? 'Someone';
  }

  private logEventError(
    eventName: string,
    taskId: number,
    error: unknown,
  ): void {
    this.logger.error(
      `Could not emit ${eventName} for task ${taskId}: ${(error as Error).message}`,
      (error as Error).stack,
    );
  }

  private applyStatus(task: Task, newStatus: TaskStatus): boolean {
    if (task.status === newStatus) return false;

    task.status = newStatus;
    task.completedAt = newStatus === 'done' ? new Date() : null;
    return true;
  }

  private applyScope(
    qb: SelectQueryBuilder<Task>,
    userId: number,
    scope: ListTasksQueryDto['scope'],
  ): void {
    if (scope === 'owned') {
      qb.where('task.ownerId = :userId', { userId });
    } else if (scope === 'shared') {
      qb.innerJoin('task.collaborators', 'tc', 'tc.userId = :userId', {
        userId,
      });
    } else {
      qb.where(
        `task.ownerId = :userId OR EXISTS (
          SELECT 1 FROM task_collaborators tc
          WHERE tc.task_id = task.id AND tc.user_id = :userId
        )`,
        { userId },
      );
    }
  }

  private roleOf(task: Task, userId: number): TaskRole {
    if (task.ownerId === userId) {
      return 'owner';
    }
    return 'collaborator';
  }

  private async attachCollaboratorCounts(tasks: Task[]): Promise<void> {
    if (tasks.length === 0) {
      return;
    }

    const taskIds = tasks.map((task) => task.id);
    const rows = await this.collaboratorsRepository
      .createQueryBuilder('tc')
      .select('tc.taskId', 'taskId')
      .addSelect('COUNT(*)', 'count')
      .where('tc.taskId IN (:...taskIds)', { taskIds })
      .groupBy('tc.taskId')
      .getRawMany<{ taskId: number; count: string }>();

    for (const task of tasks) {
      const row = rows.find((r) => Number(r.taskId) === task.id);
      task.collaboratorCount = row ? Number(row.count) : 0;
    }
  }

  private countCollaborators(taskId: number): Promise<number> {
    return this.collaboratorsRepository.countBy({ taskId });
  }

  private applyFilters(
    qb: SelectQueryBuilder<Task>,
    query: ListTasksQueryDto,
  ): void {
    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.search) {
      const escaped = query.search
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      qb.andWhere('task.title ILIKE :search', { search: `%${escaped}%` });
    }

    if (query.dueBefore) {
      qb.andWhere('task.deadlineAt <= :dueBefore', {
        dueBefore: new Date(query.dueBefore),
      });
    }
    if (query.dueAfter) {
      qb.andWhere('task.deadlineAt >= :dueAfter', {
        dueAfter: new Date(query.dueAfter),
      });
    }
  }

  private applySorting(
    qb: SelectQueryBuilder<Task>,
    query: ListTasksQueryDto,
  ): void {
    const direction = query.order === 'asc' ? 'ASC' : 'DESC';

    if (query.sort === 'deadline') {
      qb.orderBy('task.deadlineAt', direction, 'NULLS LAST');
    } else {
      qb.orderBy('task.createdAt', direction);
    }

    qb.addOrderBy('task.id', direction);
  }
}
