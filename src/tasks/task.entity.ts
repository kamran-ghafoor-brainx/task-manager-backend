import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TaskStatus } from '../common/types';
import { TaskCollaborator } from '../collaboration/task-collaborator.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'tasks' })
@Index('IDX_tasks_owner_id', ['ownerId'])
@Index('IDX_tasks_deadline_at', ['deadlineAt'])
@Check('CHK_tasks_status', `"status" IN ('todo', 'in_progress', 'done')`)
@Check('CHK_tasks_title_not_blank', `length(trim("title")) > 0`)
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id', type: 'integer' })
  ownerId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 20, default: 'todo' })
  status!: TaskStatus;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @OneToMany(() => TaskCollaborator, (tc) => tc.task)
  collaborators!: TaskCollaborator[];

  collaboratorCount?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
