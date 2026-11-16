import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'task_collaborators' })
@Index('IDX_task_collaborators_user_id', ['userId'])
export class TaskCollaborator {
  @PrimaryColumn({ name: 'task_id', type: 'integer' })
  taskId!: number;

  @PrimaryColumn({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'added_by_id', type: 'integer', nullable: true })
  addedById!: number | null;

  @ManyToOne(() => Task, (task) => task.collaborators, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'added_by_id' })
  addedBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
