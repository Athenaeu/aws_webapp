import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ApplicantEntity } from './applicant.entity';

@Entity('o_level_results')
export class OLevelResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicantId: string;

  @ManyToOne(() => ApplicantEntity, (a) => a.oLevelResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicantId' })
  applicant: ApplicantEntity;

  @Column()
  subject: string;

  @Column()
  grade: string;

  @Column()
  sittingYear: number;

  @Column()
  session: string;

  @Column({ nullable: true })
  candidateNumber: string;

  @Column({ nullable: true })
  centre: string;

  @CreateDateColumn()
  createdAt: Date;
}
