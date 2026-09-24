import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { OLevelResultEntity } from '../database/entities/o-level-result.entity';
import { ALevelResultEntity } from '../database/entities/a-level-result.entity';
import { DocumentEntity } from '../database/entities/document.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveResultsDto } from './dto/save-results.dto';
import { DocumentType } from '@sui/shared-types';

@Injectable()
export class ApplicantService {
  constructor(
    @InjectRepository(ApplicantEntity)
    private applicantRepo: Repository<ApplicantEntity>,
    @InjectRepository(OLevelResultEntity)
    private oLevelRepo: Repository<OLevelResultEntity>,
    @InjectRepository(ALevelResultEntity)
    private aLevelRepo: Repository<ALevelResultEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepo: Repository<DocumentEntity>,
  ) {}

  async getProfile(id: string) {
    const applicant = await this.applicantRepo.findOne({
      where: { id },
      relations: ['oLevelResults', 'aLevelResults', 'documents', 'applications', 'applications.payment'],
    });
    if (!applicant) throw new NotFoundException('Applicant not found');
    return applicant;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.applicantRepo.update(id, dto);
    return this.getProfile(id);
  }

  async saveOLevelResults(applicantId: string, dto: SaveResultsDto) {
    await this.oLevelRepo.delete({ applicantId });
    const results = dto.results.map((r) =>
      this.oLevelRepo.create({ ...r, applicantId }),
    );
    await this.oLevelRepo.save(results);
    return results;
  }

  async saveALevelResults(applicantId: string, dto: SaveResultsDto) {
    await this.aLevelRepo.delete({ applicantId });
    const results = dto.results.map((r) =>
      this.aLevelRepo.create({ ...r, applicantId }),
    );
    await this.aLevelRepo.save(results);
    return results;
  }

  async saveDocument(
    applicantId: string,
    type: DocumentType,
    fileRef: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    await this.documentRepo.delete({ applicantId, type });
    const doc = this.documentRepo.create({
      applicantId, type, fileRef, fileName, mimeType, sizeBytes,
    });
    await this.documentRepo.save(doc);
    return doc;
  }

  async updatePhotoUrl(applicantId: string, photoUrl: string) {
    await this.applicantRepo.update(applicantId, { photoUrl });
  }
}
