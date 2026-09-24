import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { DiscountType } from '@sui/shared-types';

export class CreatePromoCodeDto {
  @IsString() code: string;
  @IsEnum(DiscountType) discountType: DiscountType;
  @IsNumber() @Min(0) discountValue: number;
  @IsOptional() @IsNumber() @Min(1) maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
}
