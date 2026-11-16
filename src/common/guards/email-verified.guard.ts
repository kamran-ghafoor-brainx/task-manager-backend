import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.types';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    if (this.routeHas(IS_PUBLIC_KEY, context)) return true;

    if (this.routeHas(ALLOW_UNVERIFIED_KEY, context)) return true;

    const user = context.switchToHttp().getRequest<Request>().user as AuthUser;
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before continuing',
      });
    }

    return true;
  }

  private routeHas(key: string, context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}
