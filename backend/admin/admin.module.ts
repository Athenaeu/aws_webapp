import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserEntity } from '../database/entities/admin-user.entity';
import { SchoolEntity } from '../database/entities/school.entity';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { ApplicationEntity } from '../database/entities/application.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUserEntity, SchoolEntity, ApplicantEntity, ApplicationEntity])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
