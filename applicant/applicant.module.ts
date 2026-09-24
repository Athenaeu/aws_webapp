import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { OLevelResultEntity } from '../database/entities/o-level-result.entity';
import { ALevelResultEntity } from '../database/entities/a-level-result.entity';
import { DocumentEntity } from '../database/entities/document.entity';
import { ApplicantController } from './applicant.controller';
import { ApplicantService } from './applicant.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicantEntity, OLevelResultEntity, ALevelResultEntity, DocumentEntity,
    ]),
    StorageModule,
  ],
  controllers: [ApplicantController],
  providers: [ApplicantService],
  exports: [ApplicantService],
})
export class ApplicantModule {}
