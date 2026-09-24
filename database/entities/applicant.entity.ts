import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Locale } from '@sui/shared-types';
import { OLevelResultEntity } from './o-level-result.entity';
import { ALevelResultEntity } from './a-level-result.entity';
import { DocumentEntity } from './document.entity';
import { ApplicationEntity } from './application.entity';

@Entity('applicants')
export class ApplicantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  division: string;

  @Column({ nullable: true })
  guardianName: string;

  @Column({ nullable: true })
  guardianPhone: string;

  @Column({ nullable: true })
  guardianEmail: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'enum', enum: Locale, default: Locale.FR })
  locale: Locale;

  @Column({ default: false })
  emailVerified: boolean;

  @OneToMany(() => OLevelResultEntity, (r) => r.applicant, { cascade: true })
  oLevelResults: OLevelResultEntity[];

  @OneToMany(() => ALevelResultEntity, (r) => r.applicant, { cascade: true })
  aLevelResults: ALevelResultEntity[];

  @OneToMany(() => DocumentEntity, (d) => d.applicant, { cascade: true })
  documents: DocumentEntity[];

  @OneToMany(() => ApplicationEntity, (a) => a.applicant)
  applications: ApplicationEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
