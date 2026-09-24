import { IsUUID, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  applicationId: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
