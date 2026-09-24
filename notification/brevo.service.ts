import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendEmailParams {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
}

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey: string;

  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow('BREVO_API_KEY');
    this.senderEmail = config.get<string>('SENDER_EMAIL') ?? 'admissions@shibmats.cm';
    this.senderName = config.get<string>('SENDER_NAME') ?? 'SHIBMATS Admissions';
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: this.senderName, email: this.senderEmail },
        to: [params.to],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    ).catch((err) => {
      this.logger.error('Failed to send email via Brevo', err?.response?.data ?? err.message);
      throw err;
    });
  }
}
