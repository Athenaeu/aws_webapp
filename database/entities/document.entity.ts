import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { DocumentType } from '@sui/shared-types';
import { ApplicantEntity } from './applicant.entity';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicantId: string;

  @ManyToOne(() => ApplicantEntity, (a) => a.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicantId' })
  applicant: ApplicantEntity;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column()
  fileRef: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  sizeBytes: number;

  @Column({ default: false })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
