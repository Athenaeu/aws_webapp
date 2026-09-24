import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '@sui/shared-types';
import { ApplicationEntity } from './application.entity';
import { PromoCodeEntity } from './promo-code.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @OneToOne(() => ApplicationEntity, (a) => a.payment)
  @JoinColumn({ name: 'applicationId' })
  application: ApplicationEntity;

  @Column({ type: 'int', default: 25000 })
  originalAmount: number;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;

  @Column({ type: 'int' })
  finalAmount: number;

  @Column({ type: 'uuid', nullable: true })
  promoCodeId: string | null;

  @ManyToOne(() => PromoCodeEntity, { nullable: true })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCodeEntity | null;

  @Column({ unique: true })
  mchTransactionRef: string;

  @Column({ type: 'varchar', nullable: true })
  tranzakRequestId: string | null;

  @Column({ type: 'varchar', nullable: true })
  tranzakTransactionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymentAuthUrl: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
