import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from '../database/entities/payment.entity';
import { ApplicationEntity } from '../database/entities/application.entity';
import { PromoCodeEntity } from '../database/entities/promo-code.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { TranzakService } from './tranzak.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity, ApplicationEntity, PromoCodeEntity])],
  controllers: [PaymentController],
  providers: [PaymentService, TranzakService],
  exports: [PaymentService],
})
export class PaymentModule {}
