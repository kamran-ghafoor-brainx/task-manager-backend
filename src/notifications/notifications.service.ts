import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { NotificationType } from '../common/types';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { Notification } from './notification.entity';

export type PaginatedNotifications = {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
};

export type CreateNotificationInput = {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? {},
    });
    return this.notificationsRepository.save(notification);
  }

  async findAll(
    userId: number,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  async countUnread(userId: number): Promise<number> {
    return this.notificationsRepository.countBy({
      userId,
      readAt: IsNull(),
    });
  }

  async markRead(
    notificationId: number,
    userId: number,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOneBy({
      id: notificationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found',
      });
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
    }

    return notification;
  }

  async markAllRead(userId: number): Promise<void> {
    await this.notificationsRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }
}
