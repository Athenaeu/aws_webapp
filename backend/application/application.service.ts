import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationEntity } from '../database/entities/application.entity';
import { StatusEventEntity } from '../database/entities/status-event.entity';
import { ProgrammeEntity } from '../database/entities/programme.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { ApplicationStatus, PaymentStatus } from '@sui/shared-types';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { BrevoService } from '../notification/brevo.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(StatusEventEntity)
    private statusEventRepo: Repository<StatusEventEntity>,
    @InjectRepository(ProgrammeEntity)
    private programmeRepo: Repository<ProgrammeEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    private brevo: BrevoService,
  ) {}

  async create(applicantId: string, dto: CreateApplicationDto) {
    const existing = await this.applicationRepo.findOne({
      where: { applicantId, status: ApplicationStatus.DRAFT },
    });
    if (existing) throw new ConflictException('You already have a draft application');

    await this.validateProgrammes([
      dto.choice1ProgrammeId, dto.choice2ProgrammeId, dto.choice3ProgrammeId,
    ]);

    const application = this.applicationRepo.create({
      applicantId,
      choice1ProgrammeId: dto.choice1ProgrammeId,
      choice2ProgrammeId: dto.choice2ProgrammeId,
      choice3ProgrammeId: dto.choice3ProgrammeId,
      status: ApplicationStatus.DRAFT,
    });
    await this.applicationRepo.save(application);
    return application;
  }

  async findByApplicant(applicantId: string) {
    return this.applicationRepo.find({
      where: { applicantId },
      relations: ['choice1Programme', 'choice2Programme', 'choice3Programme', 'statusEvents', 'payment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, applicantId?: string) {
    const where: Record<string, string> = { id };
    if (applicantId) where.applicantId = applicantId;

    const app = await this.applicationRepo.findOne({
      where,
      relations: [
        'applicant', 'applicant.oLevelResults', 'applicant.aLevelResults', 'applicant.documents',
        'choice1Programme', 'choice1Programme.school',
        'choice2Programme', 'choice2Programme.school',
        'choice3Programme', 'choice3Programme.school',
        'admittedProgramme', 'admittedProgramme.school',
        'statusEvents', 'statusEvents.changedBy', 'payment',
      ],
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async onPaymentConfirmed(applicationId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return;

    const appNumber = await this.generateApplicationNumber(application);
    application.applicationNumber = appNumber;
    await this.applicationRepo.save(application);
  }

  async submit(applicantId: string, applicationId: string) {
    const application = await this.findOne(applicationId, applicantId);
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Application is not in draft state');
    }

    const payment = await this.paymentRepo.findOne({
      where: { applicationId, status: PaymentStatus.SUCCESSFUL },
    });
    if (!payment) throw new BadRequestException('Payment must be completed before submitting');

    await this.transitionStatus(
      application, ApplicationStatus.SUBMITTED, null, null,
    );
    application.submittedAt = new Date();
    await this.applicationRepo.save(application);
    return application;
  }

  async forceSubmit(adminId: string, applicationId: string) {
    // Use a plain query (no deep relations) to avoid TypeORM hydration losing root id
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('Application is not in draft state');
    }
    if (!application.applicationNumber) {
      application.applicationNumber = await this.generateApplicationNumber(application);
      await this.applicationRepo.save(application);
    }
    application.submittedAt = new Date();
    await this.transitionStatus(application, ApplicationStatus.SUBMITTED, 'Manually submitted by admin', adminId);
    return this.findOne(applicationId);
  }

  async review(adminId: string, applicationId: string, dto: ReviewApplicationDto) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');

    const statusMap: Record<string, ApplicationStatus> = {
      approve: ApplicationStatus.APPROVED,
      reject: ApplicationStatus.REJECTED,
      query: ApplicationStatus.QUERY_RAISED,
    };

    const newStatus = statusMap[dto.action];
    if (!newStatus) throw new BadRequestException('Invalid action');

    await this.transitionStatus(application, newStatus, dto.note ?? null, adminId);
    return this.findOne(applicationId);
  }

  async admit(adminId: string, applicationId: string, admittedProgrammeId?: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application must be approved before admitting');
    }
    if (admittedProgrammeId) {
      application.admittedProgrammeId = admittedProgrammeId;
      await this.applicationRepo.save(application);
    }
    await this.transitionStatus(application, ApplicationStatus.ADMITTED, null, adminId);
    return this.findOne(applicationId);
  }

  async trackByNumber(applicationNumber: string, emailOrPhone: string) {
    const application = await this.applicationRepo.findOne({
      where: { applicationNumber },
      relations: [
        'applicant', 'choice1Programme', 'choice2Programme', 'choice3Programme',
        'statusEvents',
      ],
    });
    if (!application) throw new NotFoundException('Application not found');

    const { applicant } = application;
    if (applicant.email !== emailOrPhone && applicant.phone !== emailOrPhone) {
      throw new NotFoundException('Application not found');
    }

    return {
      applicationNumber: application.applicationNumber,
      status: application.status,
      submittedAt: application.submittedAt,
      statusEvents: application.statusEvents,
      choices: [
        application.choice1Programme?.name,
        application.choice2Programme?.name,
        application.choice3Programme?.name,
      ],
    };
  }

  async getStats() {
    const rows = await this.applicationRepo
      .createQueryBuilder('app')
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany();

    const stats = { total: 0, submitted: 0, under_review: 0, queried: 0, approved: 0, rejected: 0, admitted: 0, draft: 0, revenue: 0 };
    for (const row of rows) {
      const count = parseInt(row.count, 10);
      stats.total += count;
      const key = row.status as string;
      if (key in stats) (stats as any)[key] = count;
    }

    const paid = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.finalAmount)', 'total')
      .where('p.status = :s', { s: 'successful' })
      .getRawOne();
    stats.revenue = parseInt(paid?.total ?? '0', 10);

    return stats;
  }

  // Admin list
  async findAll(filters: { status?: ApplicationStatus; schoolId?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.applicationRepo.createQueryBuilder('app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.choice1Programme', 'p1')
      .leftJoinAndSelect('p1.school', 's1')
      .leftJoinAndSelect('app.payment', 'payment')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) qb.andWhere('app.status = :status', { status: filters.status });
    if (filters.schoolId) qb.andWhere('s1.id = :schoolId', { schoolId: filters.schoolId });
    if (filters.search) {
      qb.andWhere(
        '(applicant.firstName ILIKE :q OR applicant.lastName ILIKE :q OR applicant.email ILIKE :q OR app.applicationNumber ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    return qb.getManyAndCount();
  }

  async bulkReview(adminId: string, ids: string[], action: 'approve' | 'reject' | 'query', note?: string) {
    const statusMap: Record<string, ApplicationStatus> = {
      approve: ApplicationStatus.APPROVED,
      reject: ApplicationStatus.REJECTED,
      query: ApplicationStatus.QUERY_RAISED,
    };
    const newStatus = statusMap[action];
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        const app = await this.findOne(id);
        await this.transitionStatus(app, newStatus, note ?? null, adminId);
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e.message });
      }
    }
    return results;
  }

  async sendAdmissionLetter(applicationId: string): Promise<{ sent: boolean; to: string }> {
    const app = await this.findOne(applicationId);
    if (app.status !== ApplicationStatus.ADMITTED) {
      throw new BadRequestException('Admission letter can only be sent to admitted applicants');
    }

    const ap = app.applicant;
    const admitted = app.admittedProgramme ?? app.choice1Programme;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const year = new Date().getFullYear();
    const academicYear = `${year}/${year + 1}`;
    const fullName = `${ap.firstName} ${ap.lastName}`;
    const programme = admitted?.name ?? 'Programme';
    const degree = admitted?.degreeType ?? '';
    const school = (admitted as any)?.school?.name ?? 'SHIBMATS University Institute';
    const refNo = app.applicationNumber ?? applicationId.slice(0, 8).toUpperCase();

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Admission Letter</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Times New Roman',Times,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Top bar -->
      <tr><td style="background:#0a1f5c;height:8px;font-size:0;">&nbsp;</td></tr>

      <!-- Gold rule -->
      <tr><td style="background:linear-gradient(90deg,#c9a84c,#f0d080,#c9a84c);height:3px;font-size:0;">&nbsp;</td></tr>

      <!-- Header -->
      <tr>
        <td style="padding:24px 36px 18px;border-bottom:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="72" valign="middle">
                <div style="width:64px;height:64px;background:#0a1f5c;border-radius:50%;border:3px solid #c9a84c;text-align:center;line-height:64px;color:#fff;font-size:26px;font-weight:900;font-family:'Times New Roman',serif;">S</div>
              </td>
              <td valign="middle" style="padding-left:12px;">
                <div style="font-size:15pt;font-weight:900;color:#0a1f5c;text-transform:uppercase;letter-spacing:0.02em;font-family:'Times New Roman',serif;">SHIBMATS University Institute</div>
                <div style="font-size:7.5pt;color:#6b7280;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,sans-serif;margin-top:3px;">Excellence &nbsp;·&nbsp; Innovation &nbsp;·&nbsp; Leadership</div>
              </td>
              <td align="right" valign="middle" style="font-family:Arial,sans-serif;font-size:7.5pt;color:#6b7280;line-height:1.8;">
                <strong style="display:block;color:#0a1f5c;font-size:8pt;">Office of the Registrar</strong>
                University Avenue, Buea, Cameroon<br>
                Tel: +237 000 000 000<br>
                admissions@shibmats.cm
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Title band -->
      <tr><td style="background:#0a1f5c;color:#fff;text-align:center;padding:10px 36px;font-family:Arial,sans-serif;font-size:10pt;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">Official Letter of Admission — ${academicYear} Academic Year</td></tr>

      <!-- Content -->
      <tr>
        <td style="padding:28px 36px;">

          <!-- Meta row -->
          <table width="100%" cellpadding="8" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:3px;font-family:Arial,sans-serif;font-size:8.5pt;color:#555;margin-bottom:24px;">
            <tr>
              <td>Date: <strong style="color:#0a1f5c;">${today}</strong></td>
              <td>Reference No: <strong style="color:#0a1f5c;">${refNo}</strong></td>
              <td>Academic Year: <strong style="color:#0a1f5c;">${academicYear}</strong></td>
            </tr>
          </table>

          <!-- Salutation -->
          <p style="font-size:11.5pt;margin:0 0 16px;">Dear <strong>${fullName}</strong>,</p>

          <!-- Body -->
          <p style="font-size:11pt;margin:0 0 14px;text-align:justify;line-height:1.7;">
            Following a thorough review of your application by the Admissions Committee of SHIBMATS University
            Institute, it is my distinct honour to inform you that you have been
            <strong>unconditionally offered admission</strong> into the programme detailed below for the
            <strong>${academicYear}</strong> academic year.
          </p>

          <!-- Offer panel -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #c9a84c;border-top:4px solid #c9a84c;border-radius:4px;background:#fffdf4;margin:20px 0;">
            <tr><td style="padding:16px 22px;">
              <div style="font-family:Arial,sans-serif;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#b45309;margin-bottom:12px;">Programme of Admission</div>
              <table width="100%" cellpadding="5" cellspacing="0" style="font-family:Arial,sans-serif;font-size:9.5pt;">
                <tr>
                  <td style="color:#6b7280;width:140px;">Programme:</td>
                  <td style="font-weight:700;font-size:12pt;color:#0a1f5c;">${degree ? degree + ' in ' : ''}${programme}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;">Faculty / School:</td>
                  <td style="font-weight:600;color:#1a1a1a;">${school}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;">Mode of Study:</td>
                  <td style="color:#1a1a1a;">Full-Time, On-Campus</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;">Student ID (Provisional):</td>
                  <td style="color:#1a1a1a;">${refNo}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Conditions -->
          <table width="100%" cellpadding="14" cellspacing="0" style="background:#f8faff;border:1px solid #dce3f5;border-radius:3px;margin:18px 0;">
            <tr><td>
              <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#0a1f5c;margin-bottom:10px;">Conditions of Admission</div>
              <ol style="font-size:10.5pt;padding-left:18px;margin:0;line-height:1.7;color:#1a1a1a;">
                <li style="margin-bottom:6px;">Report to the Admissions Office within <strong>30 calendar days</strong> with certified copies and originals of all academic credentials and national identity card.</li>
                <li style="margin-bottom:6px;">Complete enrolment by settling all prescribed tuition and administrative fees at the Bursary.</li>
                <li style="margin-bottom:6px;">Present a valid medical fitness certificate prior to resumption of academic activities.</li>
                <li style="margin-bottom:6px;">All submitted documents are subject to background verification; this offer may be withdrawn if discrepancies are discovered.</li>
                <li>Failure to enrol within the stipulated period shall be construed as a waiver of this offer.</li>
              </ol>
            </td></tr>
          </table>

          <p style="font-size:11pt;margin:0 0 14px;text-align:justify;line-height:1.7;">
            We extend our warmest congratulations on this achievement and look forward to welcoming you to our
            academic community.
          </p>
          <p style="font-size:11pt;margin:0 0 36px;">Yours faithfully,</p>

          <!-- Signature -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="border-top:1.5px solid #0a1f5c;width:210px;margin-bottom:6px;padding-top:0;">&nbsp;</div>
                <div style="font-family:Arial,sans-serif;font-weight:700;color:#0a1f5c;font-size:10pt;">Prof. / Dr. ___________________</div>
                <div style="font-family:Arial,sans-serif;color:#555;font-size:9pt;">Registrar &amp; Dean of Admissions</div>
                <div style="font-family:Arial,sans-serif;color:#555;font-size:9pt;">SHIBMATS University Institute, Buea</div>
              </td>
              <td align="right" valign="bottom">
                <div style="width:100px;height:100px;border:2px dashed #c9a84c;border-radius:50%;display:inline-block;text-align:center;line-height:1.3;padding-top:28px;font-family:Arial,sans-serif;font-size:6pt;color:#b45309;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;">Official<br>Seal</div>
              </td>
            </tr>
          </table>

          <!-- Verification bar -->
          <table width="100%" cellpadding="10" cellspacing="0" style="background:#0a1f5c;border-radius:3px;margin-top:32px;">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:7.5pt;color:#d1d5db;">
                To verify this letter, visit <strong style="color:#fff;">shibmats.cm/verify</strong> or contact admissions@shibmats.cm
              </td>
              <td align="right" style="font-family:Arial,sans-serif;font-weight:700;font-size:9pt;letter-spacing:0.1em;color:#f0d080;">${refNo}</td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:12px 36px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;font-size:7pt;color:#9ca3af;text-align:center;">
          SHIBMATS University Institute &nbsp;·&nbsp; Buea, Cameroon &nbsp;·&nbsp; shibmats.cm &nbsp;|&nbsp; Generated: ${today} &nbsp;·&nbsp; CONFIDENTIAL
        </td>
      </tr>

      <!-- Bottom bar -->
      <tr><td style="background:#0a1f5c;height:5px;font-size:0;">&nbsp;</td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.brevo.sendEmail({
      to: { email: ap.email, name: fullName },
      subject: `Admission Offer — ${academicYear} | ${programme} | SHIBMATS University Institute`,
      htmlContent,
    });

    return { sent: true, to: ap.email };
  }

  private async transitionStatus(
    application: ApplicationEntity,
    toStatus: ApplicationStatus,
    note: string | null,
    adminId: string | null,
  ) {
    const event = this.statusEventRepo.create({
      applicationId: application.id,
      fromStatus: application.status,
      toStatus,
      note,
      changedByAdminId: adminId,
    });
    await this.statusEventRepo.save(event);
    application.status = toStatus;
    await this.applicationRepo.save(application);
  }

  private async validateProgrammes(ids: string[]) {
    const programmes = await this.programmeRepo.findByIds(ids);
    if (programmes.length !== 3) throw new BadRequestException('One or more programmes not found');
    const inactive = programmes.find((p) => !p.isActive);
    if (inactive) throw new BadRequestException(`Programme "${inactive.name}" is not accepting applications`);
  }

  private async generateApplicationNumber(application: ApplicationEntity): Promise<string> {
    const year = new Date().getFullYear();
    const programme = await this.programmeRepo.findOne({
      where: { id: application.choice1ProgrammeId },
      relations: ['school'],
    });
    const schoolCode = programme?.school?.code ?? 'GEN';

    const count = await this.applicationRepo
      .createQueryBuilder('app')
      .where('EXTRACT(YEAR FROM app.createdAt) = :year', { year })
      .andWhere('app.applicationNumber IS NOT NULL')
      .getCount();

    const seq = String(count + 1).padStart(6, '0');
    return `SUI/${year}/${schoolCode}/${seq}`;
  }
}
