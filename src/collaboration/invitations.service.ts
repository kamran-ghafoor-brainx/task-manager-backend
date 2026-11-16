import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  QueryFailedError,
  In,
  Repository,
} from 'typeorm';
import {
  type InvitationAcceptedEvent,
  type InvitationCreatedEvent,
  type InvitationDeclinedEvent,
  NotificationEvents,
} from '../notifications/notification-events';
import { Task } from '../tasks/task.entity';
import { TaskAccessService } from '../tasks/task-access.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/user.service';
import {
  ReceivedInvitationResponse,
  SentInvitationResponse,
  toReceivedInvitationResponse,
  toSentInvitationResponse,
} from './collaboration-response';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { TaskCollaborator } from './task-collaborator.entity';
import { TaskInvitation } from './task-invitation.entity';

const UNIQUE_VIOLATION = '23505';

const invitationNotFound = () =>
  new NotFoundException({
    code: 'INVITATION_NOT_FOUND',
    message: 'Invitation not found',
  });
const invitationNotPending = () =>
  new ConflictException({
    code: 'INVITATION_NOT_PENDING',
    message: 'This invitation is no longer pending',
  });
const invitationExpired = () =>
  new GoneException({
    code: 'INVITATION_EXPIRED',
    message: 'This invitation has expired',
  });
const invitationAlreadyPending = () =>
  new ConflictException({
    code: 'INVITATION_PENDING',
    message: 'A pending invitation already exists for this person',
  });
const alreadyCollaborator = () =>
  new ConflictException({
    code: 'ALREADY_COLLABORATOR',
    message: 'This user is already a collaborator on this task',
  });

type ResolvedInvitee = {
  email: string;
  user: User | null;
};

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  private readonly invitationTtlMs: number;

  constructor(
    @InjectRepository(TaskInvitation)
    private readonly invitationsRepository: Repository<TaskInvitation>,
    @InjectRepository(TaskCollaborator)
    private readonly collaboratorsRepository: Repository<TaskCollaborator>,
    private readonly taskAccessService: TaskAccessService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    config: ConfigService,
  ) {
    const ttlDays = Number(config.getOrThrow('INVITATION_TTL_DAYS'));
    this.invitationTtlMs = ttlDays * 24 * 60 * 60 * 1000;
  }

  async create(
    taskId: number,
    inviterId: number,
    dto: CreateInvitationDto,
  ): Promise<SentInvitationResponse> {
    const task = await this.taskAccessService.getOwned(taskId, inviterId);

    this.assertEmailXorUsername(dto);
    const invitee = await this.resolveInvitee(dto);

    this.assertNotSelf(invitee, inviterId);
    await this.assertNotCollaborator(taskId, invitee);
    await this.expireStaleInvitations(taskId, invitee.email);
    await this.assertNoPendingInvitation(taskId, invitee.email);

    const saved = await this.saveNewInvitation(
      taskId,
      inviterId,
      invitee,
      dto.username !== undefined,
    );
    await this.emitInvitationCreated(saved, task);
    return this.findSentInvitation(saved.id);
  }

  async listForTask(
    taskId: number,
    requesterId: number,
  ): Promise<SentInvitationResponse[]> {
    await this.taskAccessService.getOwned(taskId, requesterId);

    const invitations = await this.invitationsRepository.find({
      where: { taskId, status: 'pending', expiresAt: MoreThan(new Date()) },
      relations: { inviter: true, inviteeUser: true },
      order: { createdAt: 'DESC' },
    });

    return invitations.map(toSentInvitationResponse);
  }

  async revoke(
    taskId: number,
    invitationId: number,
    requesterId: number,
  ): Promise<void> {
    await this.taskAccessService.getOwned(taskId, requesterId);

    await this.dataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(TaskInvitation, {
        where: { id: invitationId, taskId },
        lock: { mode: 'pessimistic_write' },
      });
      this.assertPending(invitation);

      invitation.status = 'revoked';
      await manager.save(TaskInvitation, invitation);
    });
  }

  async listForUser(userId: number): Promise<ReceivedInvitationResponse[]> {
    const invitations = await this.invitationsRepository.find({
      where: {
        inviteeUserId: userId,
        status: 'pending',
        expiresAt: MoreThan(new Date()),
      },
      relations: { task: true, inviter: true },
      order: { createdAt: 'DESC' },
    });

    return invitations.map(toReceivedInvitationResponse);
  }

  async accept(invitationId: number, userId: number): Promise<void> {
    const outcome = await this.dataSource.transaction((manager) =>
      this.acceptInTransaction(manager, invitationId, userId),
    );

    if (outcome === 'expired') {
      throw invitationExpired();
    }

    await this.emitResponded(
      invitationId,
      NotificationEvents.InvitationAccepted,
    );
  }

  async decline(invitationId: number, userId: number): Promise<void> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const invitation = await manager.findOne(TaskInvitation, {
        where: { id: invitationId, inviteeUserId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      this.assertPending(invitation);

      if (this.isExpired(invitation)) {
        invitation.status = 'expired';
        await manager.save(TaskInvitation, invitation);
        return 'expired';
      }

      invitation.status = 'declined';
      invitation.respondedAt = new Date();
      await manager.save(TaskInvitation, invitation);
      return 'declined';
    });

    if (outcome === 'expired') {
      throw invitationExpired();
    }

    await this.emitResponded(
      invitationId,
      NotificationEvents.InvitationDeclined,
    );
  }

  async linkByEmail(
    email: string,
    userId: number,
    manager: EntityManager,
  ): Promise<number[]> {
    const unlinked = {
      inviteeEmail: email,
      inviteeUserId: IsNull(),
      status: 'pending' as const,
      expiresAt: MoreThan(new Date()),
    };

    const toLink = await manager.find(TaskInvitation, {
      where: unlinked,
      select: { id: true },
    });
    if (toLink.length === 0) {
      return [];
    }

    const ids = toLink.map((invitation) => invitation.id);
    await manager.update(
      TaskInvitation,
      { id: In(ids) },
      {
        inviteeUserId: userId,
      },
    );
    return ids;
  }

  async notifyLinkedInvitations(
    invitationIds: number[],
    userId: number,
  ): Promise<void> {
    if (invitationIds.length === 0) {
      return;
    }
    await this.emitLinkedInvitations(invitationIds, userId);
  }

  private async emitInvitationCreated(
    invitation: TaskInvitation,
    task: Task,
  ): Promise<void> {
    try {
      const inviter = await this.usersService.findById(invitation.inviterId);
      const event: InvitationCreatedEvent = {
        taskId: task.id,
        taskTitle: task.title,
        inviterName: inviter?.name ?? 'Someone',
        inviteeUserId: invitation.inviteeUserId,
      };
      this.eventEmitter.emit(NotificationEvents.InvitationCreated, event);
    } catch (error) {
      this.logEventError(
        NotificationEvents.InvitationCreated,
        invitation.id,
        error,
      );
    }
  }

  private async emitResponded(
    invitationId: number,
    eventName:
      | typeof NotificationEvents.InvitationAccepted
      | typeof NotificationEvents.InvitationDeclined,
  ): Promise<void> {
    try {
      const invitation = await this.invitationsRepository.findOneOrFail({
        where: { id: invitationId },
        relations: { task: true, inviteeUser: true },
      });
      const responderName = invitation.inviteeUser?.name ?? 'Someone';

      if (eventName === NotificationEvents.InvitationAccepted) {
        const event: InvitationAcceptedEvent = {
          taskId: invitation.taskId,
          taskTitle: invitation.task.title,
          acceptedByName: responderName,
          taskOwnerId: invitation.inviterId,
        };
        this.eventEmitter.emit(eventName, event);
      } else {
        const event: InvitationDeclinedEvent = {
          taskId: invitation.taskId,
          taskTitle: invitation.task.title,
          declinedByName: responderName,
          taskOwnerId: invitation.inviterId,
        };
        this.eventEmitter.emit(eventName, event);
      }
    } catch (error) {
      this.logEventError(eventName, invitationId, error);
    }
  }

  private async emitLinkedInvitations(
    invitationIds: number[],
    userId: number,
  ): Promise<void> {
    try {
      const linked = await this.invitationsRepository.find({
        where: { id: In(invitationIds) },
        relations: { task: true, inviter: true },
      });

      for (const invitation of linked) {
        const event: InvitationCreatedEvent = {
          taskId: invitation.taskId,
          taskTitle: invitation.task.title,
          inviterName: invitation.inviter.name,
          inviteeUserId: userId,
        };
        this.eventEmitter.emit(NotificationEvents.InvitationCreated, event);
      }
    } catch (error) {
      this.logger.error(
        `Could not emit ${NotificationEvents.InvitationCreated} for linked invitations of user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private logEventError(
    eventName: string,
    invitationId: number,
    error: unknown,
  ): void {
    this.logger.error(
      `Could not emit ${eventName} for invitation ${invitationId}: ${(error as Error).message}`,
      (error as Error).stack,
    );
  }

  private assertEmailXorUsername(dto: CreateInvitationDto): void {
    const hasEmail = dto.email !== undefined;
    const hasUsername = dto.username !== undefined;

    if (hasEmail === hasUsername) {
      throw new UnprocessableEntityException({
        code: 'EMAIL_OR_USERNAME_REQUIRED',
        message: 'Provide either email or username, not both and not neither',
      });
    }
  }

  private async resolveInvitee(
    dto: CreateInvitationDto,
  ): Promise<ResolvedInvitee> {
    if (dto.email !== undefined) {
      const user = await this.usersService.findByEmail(dto.email);
      return { email: dto.email, user };
    }

    const user = await this.usersService.findByUsername(dto.username!);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `No user found with username "${dto.username}"`,
      });
    }
    return { email: user.email, user };
  }

  private assertNotSelf(invitee: ResolvedInvitee, inviterId: number): void {
    if (invitee.user?.id === inviterId) {
      throw new ConflictException({
        code: 'CANNOT_INVITE_SELF',
        message: 'You cannot invite yourself to your own task',
      });
    }
  }

  private async assertNotCollaborator(
    taskId: number,
    invitee: ResolvedInvitee,
  ): Promise<void> {
    if (!invitee.user) {
      return;
    }

    const isCollaborator = await this.collaboratorsRepository.existsBy({
      taskId,
      userId: invitee.user.id,
    });
    if (isCollaborator) {
      throw alreadyCollaborator();
    }
  }

  private async expireStaleInvitations(
    taskId: number,
    inviteeEmail: string,
  ): Promise<void> {
    await this.invitationsRepository.update(
      {
        taskId,
        inviteeEmail,
        status: 'pending',
        expiresAt: LessThanOrEqual(new Date()),
      },
      { status: 'expired' },
    );
  }

  private async assertNoPendingInvitation(
    taskId: number,
    inviteeEmail: string,
  ): Promise<void> {
    const pendingExists = await this.invitationsRepository.existsBy({
      taskId,
      inviteeEmail,
      status: 'pending',
      expiresAt: MoreThan(new Date()),
    });
    if (pendingExists) {
      throw invitationAlreadyPending();
    }
  }

  private async saveNewInvitation(
    taskId: number,
    inviterId: number,
    invitee: ResolvedInvitee,
    invitedByUsername: boolean,
  ): Promise<TaskInvitation> {
    const invitation = this.invitationsRepository.create({
      taskId,
      inviterId,
      inviteeEmail: invitee.email,
      inviteeUserId: invitee.user?.id ?? null,
      invitedByUsername,
      status: 'pending',
      expiresAt: new Date(Date.now() + this.invitationTtlMs),
    });

    try {
      return await this.invitationsRepository.save(invitation);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw invitationAlreadyPending();
      }
      throw error;
    }
  }

  private async findSentInvitation(
    invitationId: number,
  ): Promise<SentInvitationResponse> {
    const invitation = await this.invitationsRepository.findOneOrFail({
      where: { id: invitationId },
      relations: { inviter: true, inviteeUser: true },
    });
    return toSentInvitationResponse(invitation);
  }

  private async acceptInTransaction(
    manager: EntityManager,
    invitationId: number,
    userId: number,
  ): Promise<'accepted' | 'expired'> {
    const invitation = await manager.findOne(TaskInvitation, {
      where: { id: invitationId, inviteeUserId: userId },
      lock: { mode: 'pessimistic_write' },
    });
    this.assertPending(invitation);

    if (this.isExpired(invitation)) {
      invitation.status = 'expired';
      await manager.save(TaskInvitation, invitation);
      return 'expired';
    }

    await this.insertCollaborator(manager, invitation);

    invitation.status = 'accepted';
    invitation.respondedAt = new Date();
    await manager.save(TaskInvitation, invitation);
    return 'accepted';
  }

  private async insertCollaborator(
    manager: EntityManager,
    invitation: TaskInvitation,
  ): Promise<void> {
    const collaborator = manager.create(TaskCollaborator, {
      taskId: invitation.taskId,
      userId: invitation.inviteeUserId!,
      addedById: invitation.inviterId,
    });

    try {
      await manager.insert(TaskCollaborator, collaborator);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw alreadyCollaborator();
      }
      throw error;
    }
  }

  private assertPending(
    invitation: TaskInvitation | null,
  ): asserts invitation is TaskInvitation {
    if (!invitation) {
      throw invitationNotFound();
    }
    if (invitation.status !== 'pending') {
      throw invitationNotPending();
    }
  }

  private isExpired(invitation: TaskInvitation): boolean {
    return invitation.expiresAt.getTime() < Date.now();
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }
    const driverError = error.driverError as { code?: string };
    return driverError.code === UNIQUE_VIOLATION;
  }
}
