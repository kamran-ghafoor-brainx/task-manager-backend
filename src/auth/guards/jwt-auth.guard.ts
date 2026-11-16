import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

const tokenError = (code: string, message: string) =>
  new UnauthorizedException({ code, message });

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser | false,
    info: Error | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err) throw err;
    if (user) return user;

    if (info?.name === 'TokenExpiredError') {
      throw tokenError(
        'TOKEN_EXPIRED',
        'Your session has expired, please log in again',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.authorization) {
      throw tokenError('TOKEN_MISSING', 'Authentication is required');
    }

    throw tokenError('TOKEN_INVALID', 'The access token is invalid');
  }
}
