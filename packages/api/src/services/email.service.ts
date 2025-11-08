import { logger } from '@traveltomorrow/shared';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data?: any;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // In development, log emails instead of sending
  if (process.env.EMAIL_PROVIDER === 'mailhog') {
    logger.info('Email would be sent:', {
      to: options.to,
      subject: options.subject,
      template: options.template,
    });
    return;
  }

  // TODO: Implement actual email sending with SendGrid/AWS SES
  logger.warn('Email sending not implemented yet');
}

export default sendEmail;
