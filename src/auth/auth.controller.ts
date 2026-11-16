import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PublicUser, toPublicUser, UsersService } from '../users/user.service';
import { AuthResult, AuthService, MessageResult } from './auth.service';
import type { AuthUser } from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

const AUTH_RATE_LIMIT = { default: { ttl: 60_000, limit: 5 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle(AUTH_RATE_LIMIT)
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle(AUTH_RATE_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @AllowUnverified()
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    const freshUser = await this.usersService.findById(user.id);
    if (!freshUser)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'This account no longer exists',
      });
    return toPublicUser(freshUser);
  }

  @Public()
  @Throttle(AUTH_RATE_LIMIT)
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authService.verifyEmail(dto.token);
  }

  @AllowUnverified()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  resendVerification(@CurrentUser() user: AuthUser): Promise<MessageResult> {
    return this.authService.resendVerification(user.id);
  }

  @Public()
  @Throttle(AUTH_RATE_LIMIT)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResult> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle(AUTH_RATE_LIMIT)
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
