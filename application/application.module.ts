import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from '../database/entities/application.entity';
import { StatusEventEntity } from '../database/entities/status-event.entity';
import { ProgrammeEntity } from '../database/entities/programme.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity, StatusEventEntity, ProgrammeEntity, PaymentEntity,
    ]),
    NotificationModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
