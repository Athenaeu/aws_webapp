import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { SchoolEntity } from './school.entity';

@Entity('programmes')
export class ProgrammeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  schoolId: string;

  @ManyToOne(() => SchoolEntity, (s) => s.programmes)
  @JoinColumn({ name: 'schoolId' })
  school: SchoolEntity;

  @Column()
  name: string;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column()
  degreeType: string;

  @Column({ nullable: true })
  intakeCapacity: number;

  @Column({ type: 'jsonb', nullable: true })
  minOLevelGrades: Record<string, string> | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
