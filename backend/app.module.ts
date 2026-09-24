import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { ApplicantModule } from './applicant/applicant.module';
import { ApplicationModule } from './application/application.module';
import { ProgrammeModule } from './programme/programme.module';
import { PaymentModule } from './payment/payment.module';
import { PromoCodeModule } from './promo-code/promo-code.module';
import { WebhookModule } from './webhook/webhook.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { entities } from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../.env'),       // apps/api/dist -> apps/api -> .env (running built)
        join(__dirname, '../../../.env'),     // apps/api/src -> repo root .env (ts-node dev)
        join(process.cwd(), '../../.env'),    // fallback: cwd relative
        join(process.cwd(), '.env'),          // local .env if present
      ],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        entities,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        migrations: ['dist/database/migrations/*.js'],
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL', 'redis://localhost:6379'),
        // Bull will retry connection — API boots even if Redis is temporarily unavailable
        settings: { stalledInterval: 0 },
      }),
    }),

    AuthModule,
    ApplicantModule,
    ApplicationModule,
    ProgrammeModule,
    PaymentModule,
    PromoCodeModule,
    WebhookModule,
    NotificationModule,
    AdminModule,
    StorageModule,
  ],
})
export class AppModule {}
