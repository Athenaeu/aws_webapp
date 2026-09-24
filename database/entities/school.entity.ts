import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { ProgrammeEntity } from './programme.entity';

@Entity('schools')
export class SchoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true, length: 10 })
  code: string;

  @OneToMany(() => ProgrammeEntity, (p) => p.school)
  programmes: ProgrammeEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
