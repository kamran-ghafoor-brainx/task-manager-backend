import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  type CollaboratorRemovedEvent,
  type InvitationAcceptedEvent,
  type InvitationCreatedEvent,
  type InvitationDeclinedEvent,
  NotificationEvents,
  type TaskDeletedEvent,
  type TaskStatusChangedEvent,
  type TaskUpdatedEvent,
} from './notification-events';
import {
  type CreateNotificationInput,
  NotificationsService,
} from './notifications.service';
import { RealtimeGateway } from './realtime.gateway';

type NotificationContent = Omit<CreateNotificationInput, 'userId'>;

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @OnEvent(NotificationEvents.InvitationCreated)
  async onInvitationCreated(event: InvitationCreatedEvent): Promise<void> {
    if (event.inviteeUserId === null) return;

    await this.notify(event.inviteeUserId, {
      type: 'invitation.received',
      title: 'You were invited to collaborate',
      body: `${event.inviterName} invited you to collaborate on "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  @OnEvent(NotificationEvents.InvitationAccepted)
  async onInvitationAccepted(event: InvitationAcceptedEvent): Promise<void> {
    await this.notify(event.taskOwnerId, {
      type: 'invitation.accepted',
      title: 'Invitation accepted',
      body: `${event.acceptedByName} accepted your invitation to "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  @OnEvent(NotificationEvents.InvitationDeclined)
  async onInvitationDeclined(event: InvitationDeclinedEvent): Promise<void> {
    await this.notify(event.taskOwnerId, {
      type: 'invitation.declined',
      title: 'Invitation declined',
      body: `${event.declinedByName} declined your invitation to "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  @OnEvent(NotificationEvents.CollaboratorRemoved)
  async onCollaboratorRemoved(event: CollaboratorRemovedEvent): Promise<void> {
    if (!event.removedByOwner) return;

    await this.notify(event.removedUserId, {
      type: 'collaborator.removed',
      title: 'Removed from task',
      body: `${event.removedByName} removed you from "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  @OnEvent(NotificationEvents.TaskStatusChanged)
  async onTaskStatusChanged(event: TaskStatusChangedEvent): Promise<void> {
    const recipients = event.notifyUserIds.filter(
      (userId) => userId !== event.changedByUserId,
    );

    await this.notifyMany(recipients, {
      type: 'task.status_changed',
      title: 'Task status updated',
      body: `${event.changedByName} changed the status of "${event.taskTitle}" to ${event.newStatus}`,
      data: { taskId: event.taskId, newStatus: event.newStatus },
    });
  }

  @OnEvent(NotificationEvents.TaskUpdated)
  async onTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    await this.notifyMany(event.collaboratorIds, {
      type: 'task.updated',
      title: 'Task updated',
      body: `${event.updatedByName} updated the task "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  @OnEvent(NotificationEvents.TaskDeleted)
  async onTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    await this.notifyMany(event.collaboratorIds, {
      type: 'task.deleted',
      title: 'Task deleted',
      body: `${event.deletedByName} deleted the task "${event.taskTitle}"`,
      data: { taskId: event.taskId },
    });
  }

  private async notifyMany(
    userIds: number[],
    content: NotificationContent,
  ): Promise<void> {
    await Promise.all(userIds.map((userId) => this.notify(userId, content)));
  }

  private async notify(
    userId: number,
    content: NotificationContent,
  ): Promise<void> {
    try {
      const notification = await this.notificationsService.create({
        userId,
        ...content,
      });

      this.realtimeGateway.emitToUser(
        userId,
        'notification.created',
        notification,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify user ${userId} (${content.type}): ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
