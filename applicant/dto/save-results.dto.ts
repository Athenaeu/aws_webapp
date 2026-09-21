import { Type } from 'class-transformer';
import { IsArray, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';

class ResultItemDto {
  @IsString() subject: string;
  @IsString() grade: string;
  @IsNumber() sittingYear: number;
  @IsString() session: string;
  @IsOptional() @IsNumber() points?: number;
  @IsOptional() @IsString() candidateNumber?: string;
  @IsOptional() @IsString() centre?: string;
}

export class SaveResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results: ResultItemDto[];
}
