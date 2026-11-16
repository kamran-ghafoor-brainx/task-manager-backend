import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { InvitationsService } from './invitations.service';
import { MyInvitationsController } from './my-invitations.controller';
import { TaskCollaborator } from './task-collaborator.entity';
import { TaskInvitation } from './task-invitation.entity';
import { TaskInvitationsController } from './task-invitations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskCollaborator, TaskInvitation]),
    TasksModule,
    UsersModule,
  ],
  controllers: [
    TaskInvitationsController,
    MyInvitationsController,
    CollaboratorsController,
  ],
  providers: [InvitationsService, CollaboratorsService],
  exports: [CollaboratorsService, InvitationsService],
})
export class CollaborationModule {}
