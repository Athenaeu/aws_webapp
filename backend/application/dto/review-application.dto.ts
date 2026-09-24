import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['approve', 'reject', 'query'])
  action: 'approve' | 'reject' | 'query';

  @IsOptional()
  @IsString()
  note?: string;
}
