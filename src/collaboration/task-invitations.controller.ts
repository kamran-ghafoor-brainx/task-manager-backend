import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { SentInvitationResponse } from './collaboration-response';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('tasks/:taskId/invitations')
export class TaskInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseIdPipe) taskId: number,
    @Body() dto: CreateInvitationDto,
  ): Promise<SentInvitationResponse> {
    return this.invitationsService.create(taskId, user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseIdPipe) taskId: number,
  ): Promise<SentInvitationResponse[]> {
    return this.invitationsService.listForTask(taskId, user.id);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseIdPipe) taskId: number,
    @Param('invitationId', ParseIdPipe) invitationId: number,
  ): Promise<void> {
    return this.invitationsService.revoke(taskId, invitationId, user.id);
  }
}
