import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.types';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserToken } from './user-token.entity';
import { UserTokensService } from './user-tokens.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([UserToken]),
    MailModule,
    CollaborationModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: Number(config.getOrThrow('JWT_EXPIRES_IN_SECONDS')),
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, UserTokensService, JwtStrategy],
})
export class AuthModule {}
