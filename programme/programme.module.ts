import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolEntity } from '../database/entities/school.entity';
import { ProgrammeEntity } from '../database/entities/programme.entity';
import { ProgrammeController } from './programme.controller';
import { ProgrammeService } from './programme.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolEntity, ProgrammeEntity])],
  controllers: [ProgrammeController],
  providers: [ProgrammeService],
  exports: [ProgrammeService],
})
export class ProgrammeModule {}
