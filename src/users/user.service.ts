import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { Role } from '../common/types';
import { User } from './user.entity';

export type PublicUser = {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type CreateUserInput = {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
};

const UNIQUE_VIOLATION = '23505';

const emailTaken = () =>
  new ConflictException({
    code: 'EMAIL_TAKEN',
    message: 'An account with this email already exists',
  });
const usernameTaken = () =>
  new ConflictException({
    code: 'USERNAME_TAKEN',
    message: 'This username is already taken',
  });

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create({ ...input, role: 'user' });
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      throw this.toConflict(error);
    }
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  private toConflict(error: unknown): unknown {
    if (!(error instanceof QueryFailedError)) return error;

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    if (driverError.code !== UNIQUE_VIOLATION) return error;

    if (driverError.constraint === 'UQ_users_email') return emailTaken();
    if (driverError.constraint === 'UQ_users_username') return usernameTaken();
    return error;
  }
}
