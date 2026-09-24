import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { PaymentEntity } from '../database/entities/payment.entity';
import { ApplicationEntity } from '../database/entities/application.entity';
import { PromoCodeEntity } from '../database/entities/promo-code.entity';
import { TranzakService } from './tranzak.service';
import { PaymentStatus, ApplicationStatus, DiscountType, APPLICATION_FEE_XAF } from '@sui/shared-types';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(ApplicationEntity)
    private applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(PromoCodeEntity)
    private promoCodeRepo: Repository<PromoCodeEntity>,
    private tranzak: TranzakService,
    private config: ConfigService,
  ) {}

  async initiatePayment(applicantId: string, applicationId: string, promoCode?: string) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId, applicantId },
    });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ConflictException('Application already submitted');
    }

    const existingPayment = await this.paymentRepo.findOne({
      where: { applicationId, status: PaymentStatus.SUCCESSFUL },
    });
    if (existingPayment) throw new ConflictException('Payment already completed');

    let discountAmount = 0;
    let promoCodeEntity: PromoCodeEntity | null = null;

    if (promoCode) {
      promoCodeEntity = await this.validateAndReservePromoCode(promoCode);
      discountAmount = this.calculateDiscount(APPLICATION_FEE_XAF, promoCodeEntity);
    }

    const finalAmount = Math.max(0, APPLICATION_FEE_XAF - discountAmount);
    const mchTransactionRef = `SUI-PAY-${uuidv4()}`;

    const apiUrl = this.config.getOrThrow('API_URL');
    const portalUrl = this.config.get('APPLICANT_PORTAL_URL', 'http://localhost:3000');

    const { requestId, paymentAuthUrl } = await this.tranzak.createPaymentRequest({
      amount: finalAmount,
      mchTransactionRef,
      description: `SHIBMATS Application Fee — ${mchTransactionRef}`,
      returnUrl: `${portalUrl}/apply/payment/callback?ref=${mchTransactionRef}`,
      cancelUrl: `${portalUrl}/apply/payment/cancel`,
      callbackUrl: `${apiUrl}/api/v1/webhooks/tranzak`,
    });

    const payment = this.paymentRepo.create({
      applicationId,
      originalAmount: APPLICATION_FEE_XAF,
      discountAmount,
      finalAmount,
      promoCodeId: promoCodeEntity?.id ?? null,
      mchTransactionRef,
      tranzakRequestId: requestId,
      paymentAuthUrl,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      finalAmount,
      discountAmount,
      promoCode: promoCodeEntity?.code ?? null,
      paymentAuthUrl,
    };
  }

  async getPaymentByRef(mchTransactionRef: string) {
    return this.paymentRepo.findOne({ where: { mchTransactionRef } });
  }

  async markPaymentSuccessful(mchTransactionRef: string, tranzakTransactionId: string) {
    const payment = await this.paymentRepo.findOne({ where: { mchTransactionRef } });
    if (!payment) return null;

    payment.status = PaymentStatus.SUCCESSFUL;
    payment.tranzakTransactionId = tranzakTransactionId;
    payment.paidAt = new Date();
    await this.paymentRepo.save(payment);

    if (payment.promoCodeId) {
      await this.promoCodeRepo.increment({ id: payment.promoCodeId }, 'usedCount', 1);
    }

    return payment;
  }

  async markPaymentFailed(mchTransactionRef: string) {
    await this.paymentRepo.update(
      { mchTransactionRef },
      { status: PaymentStatus.FAILED },
    );
  }

  private async validateAndReservePromoCode(code: string): Promise<PromoCodeEntity> {
    const promo = await this.promoCodeRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!promo) throw new BadRequestException('Invalid or inactive promo code');
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo code has expired');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }
    return promo;
  }

  private calculateDiscount(originalAmount: number, promo: PromoCodeEntity): number {
    if (promo.discountType === DiscountType.PERCENTAGE) {
      return Math.round((originalAmount * Number(promo.discountValue)) / 100);
    }
    return Math.min(originalAmount, Number(promo.discountValue));
  }

  async validatePromoCode(code: string) {
    try {
      const promo = await this.validateAndReservePromoCode(code);
      const discountAmount = this.calculateDiscount(APPLICATION_FEE_XAF, promo);
      return {
        valid: true,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
        discountAmount,
        finalAmount: Math.max(0, APPLICATION_FEE_XAF - discountAmount),
      };
    } catch {
      return {
        valid: false,
        discountType: null,
        discountValue: null,
        discountAmount: 0,
        finalAmount: APPLICATION_FEE_XAF,
      };
    }
  }
}
