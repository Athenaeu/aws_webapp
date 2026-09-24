import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { Locale } from '@sui/shared-types';

export class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(['male', 'female', 'other']) gender?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianPhone?: string;
  @IsOptional() @IsString() guardianEmail?: string;
  @IsOptional() @IsEnum(Locale) locale?: Locale;
}
