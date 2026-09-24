import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsMobilePhone } from 'class-validator';
import { Locale } from '@sui/shared-types';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
