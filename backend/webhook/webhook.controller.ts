import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../payment/payment.service';
import { ApplicationService } from '../application/application.service';
import { NotificationService } from '../notification/notification.service';

interface TranzakWebhookPayload {
  eventType: string;
  authKey: string;
  resourceId: string;
  resource: {
    requestId: string;
    status: string;
    mchTransactionRef: string;
    transactionId?: string;
    amount: number;
    currencyCode: string;
  };
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private config: ConfigService,
    private paymentService: PaymentService,
    private applicationService: ApplicationService,
    private notificationService: NotificationService,
  ) {}

  @Post('tranzak')
  async handleTranzak(@Body() payload: TranzakWebhookPayload) {
    const expectedKey = this.config.get('TRANZAK_WEBHOOK_AUTH_KEY');
    if (expectedKey && payload.authKey !== expectedKey) {
      throw new UnauthorizedException('Invalid webhook auth key');
    }

    this.logger.log(`Tranzak webhook: ${payload.eventType} — ${payload.resource?.mchTransactionRef}`);

    if (payload.eventType !== 'REQUEST.COMPLETED') return { received: true };

    const resource = payload.resource;
    if (resource.status === 'SUCCESSFUL') {
      const payment = await this.paymentService.markPaymentSuccessful(
        resource.mchTransactionRef,
        resource.transactionId ?? '',
      );
      if (payment) {
        await this.applicationService.onPaymentConfirmed(payment.applicationId);
        this.notificationService.queuePaymentConfirmed(payment.applicationId).catch(
          (err) => this.logger.error('Failed to queue payment notification', err),
        );
      }
    } else if (['FAILED', 'CANCELLED'].includes(resource.status)) {
      await this.paymentService.markPaymentFailed(resource.mchTransactionRef);
    }

    return { received: true };
  }
}
