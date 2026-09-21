import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { AdminUserEntity } from '../database/entities/admin-user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ApplicantEntity)
    private applicantRepo: Repository<ApplicantEntity>,
    @InjectRepository(AdminUserEntity)
    private adminRepo: Repository<AdminUserEntity>,
    private jwtService: JwtService,
  ) {}

  async registerApplicant(dto: RegisterDto) {
    const existing = await this.applicantRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) throw new ConflictException('Email or phone already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const applicant = this.applicantRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      locale: dto.locale,
    });
    await this.applicantRepo.save(applicant);

    const token = this.jwtService.sign({ sub: applicant.id, type: 'applicant' });
    return { accessToken: token, applicantId: applicant.id };
  }

  async loginApplicant(dto: LoginDto) {
    const applicant = await this.applicantRepo.findOne({
      where: { email: dto.email },
    });
    if (!applicant) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, applicant.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: applicant.id, type: 'applicant' });
    return { accessToken: token, applicantId: applicant.id };
  }

  async loginAdmin(dto: LoginDto) {
    const admin = await this.adminRepo.findOne({ where: { email: dto.email } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      sub: admin.id,
      type: 'admin',
      role: admin.role,
      schoolId: admin.schoolId,
    });
    return {
      accessToken: token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        firstName: admin.name.split(' ')[0],
        lastName: admin.name.split(' ').slice(1).join(' ') || '',
        role: admin.role,
        schoolId: admin.schoolId,
      },
    };
  }
}
