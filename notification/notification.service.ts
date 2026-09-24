import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export type EmailJobType =
  | 'payment_confirmed'
  | 'application_submitted'
  | 'query_raised'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'admitted';

@Injectable()
export class NotificationService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async queuePaymentConfirmed(applicationId: string) {
    await this.emailQueue.add('payment_confirmed', { applicationId });
  }

  async queueApplicationSubmitted(applicationId: string) {
    await this.emailQueue.add('application_submitted', { applicationId });
  }

  async queueStatusChange(applicationId: string, type: EmailJobType) {
    await this.emailQueue.add(type, { applicationId });
  }
}
