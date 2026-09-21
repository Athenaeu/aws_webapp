import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('initiate')
  initiate(@CurrentUser() user: ApplicantEntity, @Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiatePayment(user.id, dto.applicationId, dto.promoCode);
  }

  @Post('validate-promo')
  validatePromo(@Body() dto: ValidatePromoDto) {
    return this.paymentService.validatePromoCode(dto.code);
  }

  @Get('status/:ref')
  getStatus(@Param('ref') ref: string) {
    return this.paymentService.getPaymentByRef(ref);
  }
}
