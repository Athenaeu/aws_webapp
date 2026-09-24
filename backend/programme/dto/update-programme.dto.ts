import { IsString, IsOptional, IsNumber, IsObject, IsBoolean } from 'class-validator';

export class UpdateProgrammeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() degreeType?: string;
  @IsOptional() @IsNumber() intakeCapacity?: number;
  @IsOptional() @IsObject() minOLevelGrades?: Record<string, string>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
