import { IsString, MaxLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString() name: string;
  @IsString() @MaxLength(10) code: string;
}
