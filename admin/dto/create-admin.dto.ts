import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { AdminRole } from '@sui/shared-types';

export class CreateAdminDto {
  @IsEmail() email: string;
  @IsString() name: string;
  @IsEnum(AdminRole) role: AdminRole;
  @IsOptional() @IsUUID() schoolId?: string;
  @IsString() @MinLength(8) password: string;
}
