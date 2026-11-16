import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import type { ReceivedInvitationResponse } from './collaboration-response';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class MyInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  listMine(
    @CurrentUser() user: AuthUser,
  ): Promise<ReceivedInvitationResponse[]> {
    return this.invitationsService.listForUser(user.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<void> {
    return this.invitationsService.accept(id, user.id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<void> {
    return this.invitationsService.decline(id, user.id);
  }
}
