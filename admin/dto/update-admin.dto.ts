import { IsEnum, IsOptional, IsBoolean, IsString, IsUUID } from 'class-validator';
import { AdminRole } from '@sui/shared-types';

export class UpdateAdminDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(AdminRole) role?: AdminRole;
  @IsOptional() @IsUUID() schoolId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
