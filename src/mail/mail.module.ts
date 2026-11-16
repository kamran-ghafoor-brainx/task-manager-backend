import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MAIL_TRANSPORT } from './mail.constants';
import { MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('SMTP_USER');

        return nodemailer.createTransport({
          host: config.getOrThrow<string>('SMTP_HOST'),
          port: Number(config.getOrThrow('SMTP_PORT')),
          secure: String(config.get('SMTP_SECURE')) === 'true',
          auth: user
            ? { user, pass: config.get<string>('SMTP_PASS') }
            : undefined,
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
