import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JWT_AUDIENCE, JWT_ISSUER } from '../auth/auth.types';
import { UsersModule } from '../users/users.module';
import { Notification } from './notification.entity';
import { NotificationListener } from './notification.listener';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, RealtimeGateway, NotificationListener],
  exports: [NotificationsService, RealtimeGateway],
})
export class NotificationsModule {}
