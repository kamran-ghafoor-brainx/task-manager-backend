import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/user.service';
import { AuthUser, JWT_AUDIENCE, JWT_ISSUER, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(Number(payload.sub));

    if (!user || payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'This account no longer exists or the session has expired',
      });
    }

    return {
      id: user.id,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }
}
