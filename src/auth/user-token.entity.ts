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
import type { UserTokenPurpose } from '../common/types';
import { User } from '../users/user.entity';

@Entity({ name: 'user_tokens' })
@Index('UQ_user_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_user_tokens_user_id_purpose', ['userId', 'purpose'])
@Check(
  'CHK_user_tokens_purpose',
  `"purpose" IN ('email_verification', 'password_reset')`,
)
export class UserToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 30 })
  purpose!: UserTokenPurpose;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
