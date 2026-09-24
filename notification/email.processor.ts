import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { ApplicationEntity } from '../database/entities/application.entity';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { BrevoService } from './brevo.service';
import { Locale } from '@sui/shared-types';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectRepository(ApplicationEntity)
    private applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(ApplicantEntity)
    private applicantRepo: Repository<ApplicantEntity>,
    private brevo: BrevoService,
  ) {}

  @Process('payment_confirmed')
  async handlePaymentConfirmed(job: Job<{ applicationId: string }>) {
    const app = await this.applicationRepo.findOne({
      where: { id: job.data.applicationId },
      relations: ['applicant'],
    });
    if (!app) return;

    const { applicant } = app;
    const isFr = applicant.locale === Locale.FR;
    const subject = isFr
      ? 'Paiement confirmé — SHIBMATS'
      : 'Payment Confirmed — SHIBMATS';
    const html = isFr
      ? `<p>Bonjour ${applicant.firstName},<br>Votre paiement de frais d'inscription a été confirmé. Numéro de dossier : <strong>${app.applicationNumber ?? 'En attente'}</strong>.</p>`
      : `<p>Hello ${applicant.firstName},<br>Your application fee payment has been confirmed. Application number: <strong>${app.applicationNumber ?? 'Pending'}</strong>.</p>`;

    await this.brevo.sendEmail({
      to: { email: applicant.email, name: `${applicant.firstName} ${applicant.lastName}` },
      subject,
      htmlContent: html,
    });
    this.logger.log(`payment_confirmed email sent to ${applicant.email}`);
  }

  @Process('application_submitted')
  async handleApplicationSubmitted(job: Job<{ applicationId: string }>) {
    const app = await this.applicationRepo.findOne({
      where: { id: job.data.applicationId },
      relations: ['applicant'],
    });
    if (!app) return;

    const { applicant } = app;
    const isFr = applicant.locale === Locale.FR;
    const subject = isFr
      ? `Candidature soumise — ${app.applicationNumber}`
      : `Application Submitted — ${app.applicationNumber}`;
    const html = isFr
      ? `<p>Bonjour ${applicant.firstName},<br>Votre candidature <strong>${app.applicationNumber}</strong> a été soumise avec succès. Vous pouvez suivre son état en ligne.</p>`
      : `<p>Hello ${applicant.firstName},<br>Your application <strong>${app.applicationNumber}</strong> has been submitted successfully. You can track its status online.</p>`;

    await this.brevo.sendEmail({
      to: { email: applicant.email, name: `${applicant.firstName} ${applicant.lastName}` },
      subject,
      htmlContent: html,
    });
  }

  @Process('approved')
  async handleApproved(job: Job<{ applicationId: string }>) {
    await this.sendStatusEmail(job.data.applicationId, 'approved');
  }

  @Process('rejected')
  async handleRejected(job: Job<{ applicationId: string }>) {
    await this.sendStatusEmail(job.data.applicationId, 'rejected');
  }

  @Process('admitted')
  async handleAdmitted(job: Job<{ applicationId: string }>) {
    await this.sendStatusEmail(job.data.applicationId, 'admitted');
  }

  @Process('query_raised')
  async handleQueryRaised(job: Job<{ applicationId: string }>) {
    await this.sendStatusEmail(job.data.applicationId, 'query_raised');
  }

  @Process('under_review')
  async handleUnderReview(job: Job<{ applicationId: string }>) {
    await this.sendStatusEmail(job.data.applicationId, 'under_review');
  }

  private async sendStatusEmail(applicationId: string, type: string) {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['applicant'],
    });
    if (!app) return;

    const { applicant } = app;
    const isFr = applicant.locale === Locale.FR;

    const subjects: Record<string, { en: string; fr: string }> = {
      under_review: { en: 'Application Under Review', fr: 'Candidature en cours d\'examen' },
      query_raised: { en: 'Action Required on Your Application', fr: 'Action requise sur votre candidature' },
      approved: { en: 'Application Approved — SHIBMATS', fr: 'Candidature approuvée — SHIBMATS' },
      rejected: { en: 'Application Decision — SHIBMATS', fr: 'Décision sur votre candidature — SHIBMATS' },
      admitted: { en: 'Congratulations! You Are Admitted — SHIBMATS', fr: 'Félicitations ! Vous êtes admis(e) — SHIBMATS' },
    };

    const subject = isFr ? subjects[type]?.fr : subjects[type]?.en;
    if (!subject) return;

    await this.brevo.sendEmail({
      to: { email: applicant.email, name: `${applicant.firstName} ${applicant.lastName}` },
      subject,
      htmlContent: `<p>Hello ${applicant.firstName},<br>Your application <strong>${app.applicationNumber}</strong> status has been updated to: <strong>${type.replace('_', ' ').toUpperCase()}</strong>.</p>`,
    });
  }
}
