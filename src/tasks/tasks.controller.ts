import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { PaginatedTasks, TaskResponse } from './task-response';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    return this.tasksService.findAll(user.id, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasksService.create(user.id, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<TaskResponse> {
    return this.tasksService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    return this.tasksService.update(id, user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<TaskResponse> {
    return this.tasksService.updateStatus(id, user.id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ): Promise<void> {
    return this.tasksService.remove(id, user.id);
  }
}
