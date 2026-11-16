import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService implements OnModuleInit {
  private readonly bcryptCost: number;

  private dummyHash!: string;

  constructor(private readonly config: ConfigService) {
    this.bcryptCost = Number(this.config.getOrThrow('BCRYPT_COST'));
  }

  async onModuleInit(): Promise<void> {
    this.dummyHash = await bcrypt.hash(
      'dummy-password-for-timing-only',
      this.bcryptCost,
    );
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.bcryptCost);
  }

  async verify(plain: string, hash: string | null): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash ?? this.dummyHash);
    } catch {
      return false;
    }
  }
}
