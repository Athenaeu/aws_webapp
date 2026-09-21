import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolEntity } from '../database/entities/school.entity';
import { ProgrammeEntity } from '../database/entities/programme.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';

@Injectable()
export class ProgrammeService {
  constructor(
    @InjectRepository(SchoolEntity)
    private schoolRepo: Repository<SchoolEntity>,
    @InjectRepository(ProgrammeEntity)
    private programmeRepo: Repository<ProgrammeEntity>,
  ) {}

  async findAllSchools() {
    return this.schoolRepo.find({
      relations: ['programmes'],
      order: { name: 'ASC' },
    });
  }

  async createSchool(dto: CreateSchoolDto) {
    const exists = await this.schoolRepo.findOne({
      where: [{ name: dto.name }, { code: dto.code }],
    });
    if (exists) throw new ConflictException('School name or code already exists');
    return this.schoolRepo.save(this.schoolRepo.create(dto));
  }

  async createProgramme(dto: CreateProgrammeDto) {
    const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('School not found');
    return this.programmeRepo.save(this.programmeRepo.create(dto));
  }

  async updateProgramme(id: string, dto: UpdateProgrammeDto) {
    const prog = await this.programmeRepo.findOne({ where: { id } });
    if (!prog) throw new NotFoundException('Programme not found');
    Object.assign(prog, dto);
    return this.programmeRepo.save(prog);
  }

  async deleteProgramme(id: string) {
    await this.programmeRepo.update(id, { isActive: false });
  }
}
