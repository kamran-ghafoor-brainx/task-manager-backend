import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import type { Notification } from './notification.entity';
import {
  NotificationsService,
  type PaginatedNotifications,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedNotifications> {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser): Promise<{ count: number }> {
    const count = await this.notificationsService.countUnread(user.id);
    return { count };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<Notification> {
    return this.notificationsService.markRead(id, user.id);
  }
}
