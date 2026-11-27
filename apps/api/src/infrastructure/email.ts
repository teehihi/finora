import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { renderOtpEmail } from './otp-email.js';

interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailProvider {
  send(message: Message): Promise<void>;
}

class SmtpEmailProvider implements EmailProvider {
  private readonly transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_MODE === 'tls',
    requireTLS: env.SMTP_MODE === 'starttls',
    ignoreTLS: env.SMTP_MODE === 'local',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 8_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  async send(message: Message) {
    const result = await this.transport.sendMail({
      ...message,
      from: { name: 'Finora', address: env.SMTP_FROM },
    });
    const accepted = result.accepted.some((recipient) =>
      typeof recipient === 'string' && recipient.toLowerCase() === message.to.toLowerCase(),
    );
    if (!accepted) throw Object.assign(new Error('SMTP rejected recipient'), { code: 'ERECIPIENT' });
  }
}

export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  sendOtp(email: string, otp: string, type: 'sign-in' | 'email-verification') {
    return this.provider.send({ to: email, ...renderOtpEmail(otp, type) });
  }
}

export const emailService = new EmailService(new SmtpEmailProvider());
