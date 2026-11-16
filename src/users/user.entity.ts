import {
  Entity,
  Check,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import type { Role } from '../common/types';

@Entity({ name: 'users' })
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_username', ['username'], { unique: true })
@Check('CHK_users_role', `"role" IN ('user', 'admin')`)
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 30 })
  username!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: Role;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Exclude()
  @Column({ name: 'token_version', type: 'integer', default: 0 })
  tokenVersion!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
