import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { InvitationsService } from '../collaboration/invitations.service';
import { MailService } from '../mail/mail.service';
import {
  passwordChangedEmail,
  passwordResetEmail,
  verifyEmailEmail,
  welcomeEmail,
} from '../mail/templates';
import { User } from '../users/user.entity';
import { PublicUser, toPublicUser, UsersService } from '../users/user.service';
import {
  AuthEvents,
  type JwtPayload,
  type SessionsRevokedEvent,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { UserTokensService } from './user-tokens.service';

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};

export type MessageResult = {
  message: string;
};

const RESEND_COOLDOWN_MS = 60_000;

const invalidVerificationToken = () =>
  new BadRequestException({
    code: 'INVALID_VERIFICATION_TOKEN',
    message: 'This verification link is invalid or has expired',
  });
const invalidResetToken = () =>
  new BadRequestException({
    code: 'INVALID_RESET_TOKEN',
    message: 'This reset link is invalid or has expired',
  });

@Injectable()
export class AuthService {
  private readonly appUrl: string;
  private readonly verificationTtlHours: number;
  private readonly verificationTtlMs: number;
  private readonly resetTtlMinutes: number;
  private readonly resetTtlMs: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly userTokensService: UserTokensService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly invitationsService: InvitationsService,
    private readonly eventEmitter: EventEmitter2,
    config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
    this.verificationTtlHours = Number(
      config.getOrThrow('EMAIL_VERIFICATION_TTL_HOURS'),
    );
    this.verificationTtlMs = this.verificationTtlHours * 60 * 60 * 1000;
    this.resetTtlMinutes = Number(
      config.getOrThrow('PASSWORD_RESET_TTL_MINUTES'),
    );
    this.resetTtlMs = this.resetTtlMinutes * 60 * 1000;
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      passwordHash,
    });

    await this.sendVerificationEmail(user);

    const accessToken = await this.signAccessToken(user);
    return { user: toPublicUser(user), accessToken };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    const passwordOk = await this.passwordService.verify(
      dto.password,
      user?.passwordHash ?? null,
    );
    if (!user || !passwordOk) this.invalidCredentials();

    const accessToken = await this.signAccessToken(user);
    return { user: toPublicUser(user), accessToken };
  }

  async verifyEmail(token: string): Promise<void> {
    const verified = await this.dataSource.transaction(async (manager) => {
      const userId = await this.userTokensService.consume(
        token,
        'email_verification',
        manager,
      );
      if (userId === null) throw invalidVerificationToken();

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw invalidVerificationToken();

      if (user.emailVerifiedAt !== null) return null;

      await manager.update(User, user.id, { emailVerifiedAt: new Date() });
      await this.userTokensService.invalidateAll(
        user.id,
        'email_verification',
        manager,
      );
      const linkedInvitationIds = await this.invitationsService.linkByEmail(
        user.email,
        user.id,
        manager,
      );
      return { user, linkedInvitationIds };
    });

    if (verified) {
      await this.invitationsService.notifyLinkedInvitations(
        verified.linkedInvitationIds,
        verified.user.id,
      );

      this.mailService.sendInBackground({
        to: verified.user.email,
        ...welcomeEmail(verified.user.name),
      });
    }
  }

  async resendVerification(userId: number): Promise<MessageResult> {
    const user = await this.usersService.findById(userId);
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'This account no longer exists',
      });

    if (user.emailVerifiedAt !== null) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: 'Your email is already verified',
      });
    }

    const lastSentAt = await this.userTokensService.lastCreatedAt(
      userId,
      'email_verification',
    );
    if (lastSentAt && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException(
        {
          code: 'RESEND_TOO_SOON',
          message: 'Please wait before requesting another verification email',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.userTokensService.invalidateAll(userId, 'email_verification');
    await this.sendVerificationEmail(user);
    return { message: 'Verification email sent' };
  }

  async forgotPassword(email: string): Promise<MessageResult> {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const rawToken = await this.userTokensService.create(
        user.id,
        'password_reset',
        this.resetTtlMs,
      );
      const link = `${this.appUrl}/reset-password?token=${rawToken}`;
      this.mailService.sendInBackground({
        to: user.email,
        ...passwordResetEmail(user.name, link, this.resetTtlMinutes),
      });
    }

    return {
      message:
        'If an account exists for this email, a reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.dataSource.transaction(async (manager) => {
      const tokenUserId = await this.userTokensService.consume(
        token,
        'password_reset',
        manager,
      );
      if (tokenUserId === null) throw invalidResetToken();

      const passwordHash = await this.passwordService.hash(newPassword);
      await manager.update(User, tokenUserId, {
        passwordHash,
        tokenVersion: () => 'token_version + 1',
      });

      await this.userTokensService.invalidateAll(
        tokenUserId,
        'password_reset',
        manager,
      );
      return tokenUserId;
    });

    const revoked: SessionsRevokedEvent = { userId };
    this.eventEmitter.emit(AuthEvents.SessionsRevoked, revoked);

    const user = await this.usersService.findById(userId);
    if (user) {
      this.mailService.sendInBackground({
        to: user.email,
        ...passwordChangedEmail(user.name),
      });
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const rawToken = await this.userTokensService.create(
      user.id,
      'email_verification',
      this.verificationTtlMs,
    );
    const link = `${this.appUrl}/verify-email?token=${rawToken}`;
    this.mailService.sendInBackground({
      to: user.email,
      ...verifyEmailEmail(user.name, link, this.verificationTtlHours),
    });
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: String(user.id),
      role: user.role,
      ver: user.tokenVersion,
    };
    return this.jwtService.signAsync(payload);
  }

  private invalidCredentials(): never {
    throw new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });
  }
}
