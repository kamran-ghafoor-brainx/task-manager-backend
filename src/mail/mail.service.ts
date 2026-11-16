import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { MAIL_TRANSPORT } from './mail.constants';
import type { EmailContent } from './templates';

export type MailMessage = EmailContent & { to: string };

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transporter: Transporter,
    config: ConfigService,
  ) {
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (error) {
      this.logger.warn(`SMTP connection failed: ${(error as Error).message}`);
    }
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
    this.logger.log(
      `Sent "${message.subject}" to ${this.maskEmail(message.to)}`,
    );
  }

  sendInBackground(message: MailMessage): void {
    this.send(message).catch((error: Error) => {
      this.logger.error(
        `Failed to send "${message.subject}" to ${this.maskEmail(message.to)}: ${error.message}`,
      );
    });
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name?.[0] ?? '*'}***@${domain ?? ''}`;
  }
}
