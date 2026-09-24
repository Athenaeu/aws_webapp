import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from '../database/entities/application.entity';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { NotificationService } from './notification.service';
import { EmailProcessor } from './email.processor';
import { BrevoService } from './brevo.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
    TypeOrmModule.forFeature([ApplicationEntity, ApplicantEntity]),
  ],
  providers: [NotificationService, EmailProcessor, BrevoService],
  exports: [NotificationService, BrevoService],
})
export class NotificationModule {}
