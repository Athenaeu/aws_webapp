import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { PaymentModule } from '../payment/payment.module';
import { ApplicationModule } from '../application/application.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PaymentModule, ApplicationModule, NotificationModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
