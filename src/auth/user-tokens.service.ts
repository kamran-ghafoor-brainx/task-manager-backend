import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import type { UserTokenPurpose } from '../common/types';
import { UserToken } from './user-token.entity';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class UserTokensService {
  constructor(
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
  ) {}

  async create(
    userId: number,
    purpose: UserTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.tokenRepository.save({
      userId,
      purpose,
      tokenHash: sha256(rawToken),
      expiresAt,
      usedAt: null,
    });

    return rawToken;
  }

  async consume(
    rawToken: string,
    purpose: UserTokenPurpose,
    manager?: EntityManager,
  ): Promise<number | null> {
    const db = manager ?? this.tokenRepository.manager;

    const [rows] = (await db.query(
      `UPDATE user_tokens
       SET used_at = now()
       WHERE token_hash = $1
         AND purpose = $2
         AND used_at IS NULL
         AND expires_at > now()
       RETURNING user_id`,
      [sha256(rawToken), purpose],
    )) as [{ user_id: number }[], number];

    return rows[0]?.user_id ?? null;
  }

  async invalidateAll(
    userId: number,
    purpose: UserTokenPurpose,
    manager?: EntityManager,
  ): Promise<void> {
    const db = manager ?? this.tokenRepository.manager;
    await db.query(
      `UPDATE user_tokens
       SET used_at = now()
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
      [userId, purpose],
    );
  }

  async lastCreatedAt(
    userId: number,
    purpose: UserTokenPurpose,
  ): Promise<Date | null> {
    const token = await this.tokenRepository.findOne({
      where: { userId, purpose },
      order: { createdAt: 'DESC' },
    });
    return token?.createdAt ?? null;
  }
}
