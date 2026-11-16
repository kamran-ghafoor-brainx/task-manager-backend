import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { CollaboratorResponse } from './collaboration-response';
import { CollaboratorsService } from './collaborators.service';

@Controller('tasks/:taskId/collaborators')
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseIdPipe) taskId: number,
  ): Promise<CollaboratorResponse[]> {
    return this.collaboratorsService.list(taskId, user.id);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseIdPipe) taskId: number,
    @Param('userId', ParseIdPipe) targetUserId: number,
  ): Promise<void> {
    return this.collaboratorsService.remove(taskId, targetUserId, user.id);
  }
}
