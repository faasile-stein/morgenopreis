import { logger } from '@traveltomorrow/shared';
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email service supporting multiple providers:
 * - MailHog (development)
 * - Resend (production - recommended)
 * - SendGrid (enterprise alternative)
 * - SMTP (custom)
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'mailhog';
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configured provider
   */
  private initializeTransporter() {
    switch (this.provider) {
      case 'mailhog':
        // Development - MailHog
        this.transporter = nodemailer.createTransport({
          host: process.env.MAILHOG_HOST || 'localhost',
          port: parseInt(process.env.MAILHOG_PORT || '1025'),
          ignoreTLS: true,
        });
        logger.info('Email service initialized with MailHog');
        break;

      case 'resend':
        // Production - Resend (recommended)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY,
          },
        });
        logger.info('Email service initialized with Resend');
        break;

      case 'sendgrid':
        // Production - SendGrid
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        logger.info('Email service initialized with SendGrid');
        break;

      case 'smtp':
        // Custom SMTP server
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
        logger.info('Email service initialized with custom SMTP');
        break;

      default:
        logger.warn(`Unknown email provider: ${this.provider}. Using stub mode.`);
        this.transporter = null;
    }
  }

  /**
   * Render email template with data
   */
  private renderTemplate(templateName: string, data: Record<string, any> = {}): EmailTemplate {
    // Email templates
    const templates: Record<string, (data: any) => EmailTemplate> = {
      // Booking confirmation
      booking_confirmation: (data) => ({
        subject: `Booking Confirmation - ${data.bookingReference}`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #667eea;">Your Trip is Confirmed!</h1>
                <p>Thank you for booking with TravelTomorrow!</p>

                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">Booking Details</h2>
                  <p><strong>Booking Reference:</strong> ${data.bookingReference}</p>
                  <p><strong>Destination:</strong> ${data.destination}</p>
                  <p><strong>Departure:</strong> ${data.departureDate}</p>
                  <p><strong>Return:</strong> ${data.returnDate}</p>
                  <p><strong>Passengers:</strong> ${data.passengerCount}</p>
                </div>

                <p>You can view your booking details at any time by visiting your account dashboard.</p>

                <p style="margin-top: 30px;">
                  <a href="${data.bookingUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    View Booking
                  </a>
                </p>

                <p style="color: #718096; font-size: 14px; margin-top: 40px;">
                  Have questions? Reply to this email or visit our help center.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
Your Trip is Confirmed!

Thank you for booking with TravelTomorrow!

Booking Details:
Booking Reference: ${data.bookingReference}
Destination: ${data.destination}
Departure: ${data.departureDate}
Return: ${data.returnDate}
Passengers: ${data.passengerCount}

View your booking: ${data.bookingUrl}

Have questions? Reply to this email or visit our help center.
        `,
      }),

      // Price alert notification
      price_alert: (data) => ({
        subject: `Price Alert: ${data.destination} from €${data.price}!`,
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #667eea;">🎉 Price Alert!</h1>
                <p>Great news! The price for your saved destination has dropped!</p>

                <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #22543d;">${data.destination}</h2>
                  <p style="font-size: 32px; font-weight: bold; color: #38a169; margin: 10px 0;">
                    €${data.price}
                  </p>
                  <p style="color: #2f855a;">
                    ${data.priceChange > 0 ? `Down €${data.priceChange} from your alert threshold!` : 'Matching your price target!'}
                  </p>
                </div>

                <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Route:</strong> ${data.route}</p>
                  <p><strong>Travel Dates:</strong> ${data.travelDates}</p>
                  <p><strong>Price Badge:</strong> <span style="color: #38a169; font-weight: bold;">${data.priceBadge}</span></p>
                </div>

                <p>This price is available now, but it may not last long!</p>

                <p style="margin-top: 30px;">
                  <a href="${data.offerUrl}" style="background: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Book Now
                  </a>
                </p>

                <p style="color: #718096; font-size: 12px; margin-top: 40px;">
                  You're receiving this email because you set up a price alert for ${data.destination}.
                  <a href="${data.unsubscribeUrl}" style="color: #718096;">Manage alerts</a>
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
🎉 Price Alert!

Great news! The price for ${data.destination} has dropped to €${data.price}!

Route: ${data.route}
Travel Dates: ${data.travelDates}
Price Badge: ${data.priceBadge}

This price is available now, but it may not last long!

Book now: ${data.offerUrl}

Manage your alerts: ${data.unsubscribeUrl}
        `,
      }),

      // Welcome email
      welcome: (data) => ({
        subject: 'Welcome to TravelTomorrow!',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #667eea;">Welcome to TravelTomorrow! 🌍</h1>
                <p>Hi ${data.firstName || 'there'},</p>

                <p>Thanks for joining TravelTomorrow! We're excited to help you discover your next adventure.</p>

                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">Get Started</h2>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;">✨ Spin the wheel to discover destinations</li>
                    <li style="margin: 10px 0;">🔔 Set up price alerts for your dream trips</li>
                    <li style="margin: 10px 0;">💰 Find the best deals with our price badges</li>
                    <li style="margin: 10px 0;">📱 Book directly through our platform</li>
                  </ul>
                </div>

                <p style="margin-top: 30px;">
                  <a href="${data.appUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Start Exploring
                  </a>
                </p>

                <p style="color: #718096; font-size: 14px; margin-top: 40px;">
                  Questions? We're here to help! Reply to this email anytime.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
Welcome to TravelTomorrow! 🌍

Hi ${data.firstName || 'there'},

Thanks for joining TravelTomorrow! We're excited to help you discover your next adventure.

Get Started:
✨ Spin the wheel to discover destinations
🔔 Set up price alerts for your dream trips
💰 Find the best deals with our price badges
📱 Book directly through our platform

Start exploring: ${data.appUrl}

Questions? We're here to help! Reply to this email anytime.
        `,
      }),

      // Password reset
      password_reset: (data) => ({
        subject: 'Reset Your Password - TravelTomorrow',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #667eea;">Reset Your Password</h1>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>

                <p style="margin-top: 30px;">
                  <a href="${data.resetUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Reset Password
                  </a>
                </p>

                <p style="color: #718096; margin-top: 20px;">
                  This link will expire in ${data.expiryHours || 24} hours.
                </p>

                <p style="color: #e53e3e; margin-top: 30px; padding: 15px; background: #fff5f5; border-radius: 4px;">
                  If you didn't request this, you can safely ignore this email. Your password won't change.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
Reset Your Password

We received a request to reset your password. Visit this link to create a new password:

${data.resetUrl}

This link will expire in ${data.expiryHours || 24} hours.

If you didn't request this, you can safely ignore this email.
        `,
      }),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      logger.error(`Email template not found: ${templateName}`);
      return {
        subject: 'Notification from TravelTomorrow',
        html: `<p>${JSON.stringify(data)}</p>`,
        text: JSON.stringify(data),
      };
    }

    return templateFn(data);
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Render template
      const template = this.renderTemplate(options.template, options.data);

      // If no transporter configured, log only
      if (!this.transporter) {
        logger.warn('No email transporter configured. Email would be sent:', {
          to: options.to,
          subject: options.subject,
          template: options.template,
        });
        return true;
      }

      // Send email
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@traveltomorrow.be',
        to: options.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: options.attachments,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: template.subject,
        messageId: info.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data: {
    to: string;
    bookingReference: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    passengerCount: number;
    bookingUrl: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: data.to,
      subject: `Booking Confirmation - ${data.bookingReference}`,
      template: 'booking_confirmation',
      data,
    });
  }

  /**
   * Send price alert notification
   */
  async sendPriceAlert(data: {
    to: string;
    destination: string;
    price: number;
    priceChange: number;
    route: string;
    travelDates: string;
    priceBadge: string;
    offerUrl: string;
    unsubscribeUrl: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: data.to,
      subject: `Price Alert: ${data.destination} from €${data.price}!`,
      template: 'price_alert',
      data,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: {
    to: string;
    firstName?: string;
    appUrl: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: data.to,
      subject: 'Welcome to TravelTomorrow!',
      template: 'welcome',
      data,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: {
    to: string;
    resetUrl: string;
    expiryHours?: number;
  }): Promise<boolean> {
    return this.sendEmail({
      to: data.to,
      subject: 'Reset Your Password - TravelTomorrow',
      template: 'password_reset',
      data,
    });
  }

  /**
   * Verify email configuration
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('No email transporter configured');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export default send function for backward compatibility
export async function sendEmail(options: EmailOptions): Promise<void> {
  await emailService.sendEmail(options);
}

export default emailService;
