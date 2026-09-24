import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '@sui/shared-types';
import { ApplicantEntity } from './applicant.entity';
import { ProgrammeEntity } from './programme.entity';
import { StatusEventEntity } from './status-event.entity';
import { PaymentEntity } from './payment.entity';

@Entity('applications')
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  applicationNumber: string;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  @Column()
  applicantId: string;

  @ManyToOne(() => ApplicantEntity, (a) => a.applications)
  @JoinColumn({ name: 'applicantId' })
  applicant: ApplicantEntity;

  @Column()
  choice1ProgrammeId: string;

  @ManyToOne(() => ProgrammeEntity)
  @JoinColumn({ name: 'choice1ProgrammeId' })
  choice1Programme: ProgrammeEntity;

  @Column()
  choice2ProgrammeId: string;

  @ManyToOne(() => ProgrammeEntity)
  @JoinColumn({ name: 'choice2ProgrammeId' })
  choice2Programme: ProgrammeEntity;

  @Column()
  choice3ProgrammeId: string;

  @ManyToOne(() => ProgrammeEntity)
  @JoinColumn({ name: 'choice3ProgrammeId' })
  choice3Programme: ProgrammeEntity;

  @Column({ nullable: true })
  admittedProgrammeId: string;

  @ManyToOne(() => ProgrammeEntity, { nullable: true })
  @JoinColumn({ name: 'admittedProgrammeId' })
  admittedProgramme: ProgrammeEntity;

  @OneToMany(() => StatusEventEntity, (e) => e.application, { cascade: true })
  statusEvents: StatusEventEntity[];

  @OneToOne(() => PaymentEntity, (p) => p.application, { nullable: true })
  payment: PaymentEntity;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
