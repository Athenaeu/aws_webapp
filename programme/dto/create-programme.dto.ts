import { IsString, IsUUID, IsOptional, IsNumber, IsObject, MaxLength } from 'class-validator';

export class CreateProgrammeDto {
  @IsUUID() schoolId: string;
  @IsString() name: string;
  @IsString() @MaxLength(20) code: string;
  @IsString() degreeType: string;
  @IsOptional() @IsNumber() intakeCapacity?: number;
  @IsOptional() @IsObject() minOLevelGrades?: Record<string, string>;
}
