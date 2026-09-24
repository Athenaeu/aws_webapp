import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUserEntity } from '../database/entities/admin-user.entity';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { ApplicationEntity } from '../database/entities/application.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUserEntity)
    private adminRepo: Repository<AdminUserEntity>,
    @InjectRepository(ApplicantEntity)
    private applicantRepo: Repository<ApplicantEntity>,
    @InjectRepository(ApplicationEntity)
    private applicationRepo: Repository<ApplicationEntity>,
  ) {}

  findAll() {
    return this.adminRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateAdminDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.adminRepo.save(
      this.adminRepo.create({ ...dto, passwordHash }),
    );
  }

  async update(id: string, dto: UpdateAdminDto) {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');
    Object.assign(admin, dto);
    return this.adminRepo.save(admin);
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin user not found');
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) throw new BadRequestException('Current password is incorrect');
    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.adminRepo.save(admin);
    return { message: 'Password changed successfully' };
  }

  async broadcast(adminId: string, subject: string, message: string, targetStatus?: string) {
    // Build list of target applicant emails
    const qb = this.applicantRepo.createQueryBuilder('a');
    if (targetStatus) {
      qb.innerJoin('a.applications', 'app').where('app.status = :status', { status: targetStatus });
    }
    const applicants = await qb.select(['a.id', 'a.email', 'a.firstName']).getMany();

    // In production this would enqueue Brevo email jobs via BullMQ.
    // For now return the count so the frontend can confirm.
    return {
      queued: applicants.length,
      subject,
      targetStatus: targetStatus ?? 'all',
      sentBy: adminId,
    };
  }
}
