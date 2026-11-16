import type { Task } from './task.entity';

export type TaskRole = 'owner' | 'collaborator';

export type TaskResponse = {
  id: number;
  title: string;
  description: string;
  status: string;
  deadlineAt: Date | null;
  completedAt: Date | null;
  owner: { id: number; name: string; username: string };
  myRole: TaskRole;
  collaboratorCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedTasks = {
  items: TaskResponse[];
  total: number;
  page: number;
  limit: number;
};

export function toTaskResponse(task: Task, myRole: TaskRole): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    deadlineAt: task.deadlineAt,
    completedAt: task.completedAt,
    owner: {
      id: task.owner.id,
      name: task.owner.name,
      username: task.owner.username,
    },
    myRole,
    collaboratorCount: task.collaboratorCount ?? 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
