import { IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  choice1ProgrammeId: string;

  @IsUUID()
  choice2ProgrammeId: string;

  @IsUUID()
  choice3ProgrammeId: string;
}
