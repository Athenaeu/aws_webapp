import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '@sui/shared-types';
import { ApplicationEntity } from './application.entity';
import { AdminUserEntity } from './admin-user.entity';

@Entity('status_events')
export class StatusEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @ManyToOne(() => ApplicationEntity, (a) => a.statusEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: ApplicationEntity;

  @Column({ type: 'enum', enum: ApplicationStatus, nullable: true })
  fromStatus: ApplicationStatus | null;

  @Column({ type: 'enum', enum: ApplicationStatus })
  toStatus: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  changedByAdminId: string | null;

  @ManyToOne(() => AdminUserEntity, { nullable: true })
  @JoinColumn({ name: 'changedByAdminId' })
  changedBy: AdminUserEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
