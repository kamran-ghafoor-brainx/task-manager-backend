import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCollaborator } from '../collaboration/task-collaborator.entity';
import { UsersModule } from '../users/users.module';
import { TaskAccessService } from './task-access.service';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskCollaborator]), UsersModule],
  controllers: [TasksController],
  providers: [TasksService, TaskAccessService],
  exports: [TasksService, TaskAccessService],
})
export class TasksModule {}
