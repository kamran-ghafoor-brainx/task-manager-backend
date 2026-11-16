import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { InvitationStatus } from '../common/types';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'task_invitations' })
@Check(
  'CHK_task_invitations_status',
  `"status" IN ('pending', 'accepted', 'declined', 'revoked', 'expired')`,
)
@Index('UQ_task_invitations_pending', ['taskId', 'inviteeEmail'], {
  unique: true,
  where: `"status" = 'pending'`,
})
export class TaskInvitation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'task_id', type: 'integer' })
  taskId!: number;

  @Column({ name: 'inviter_id', type: 'integer' })
  inviterId!: number;

  @Column({ name: 'invitee_email', type: 'varchar', length: 254 })
  inviteeEmail!: string;

  @Column({ name: 'invitee_user_id', type: 'integer', nullable: true })
  inviteeUserId!: number | null;

  @Column({ name: 'invited_by_username', type: 'boolean', default: false })
  invitedByUsername!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: InvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'inviter_id' })
  inviter!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true, eager: false })
  @JoinColumn({ name: 'invitee_user_id' })
  inviteeUser!: User | null;
}
