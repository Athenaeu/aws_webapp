import {
  Controller, Get, Patch, Post, Body, Param, UseGuards, UseInterceptors,
  UploadedFile, ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplicantEntity } from '../database/entities/applicant.entity';
import { ApplicantService } from './applicant.service';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveResultsDto } from './dto/save-results.dto';
import { DocumentType } from '@sui/shared-types';

@ApiTags('applicants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applicants')
export class ApplicantController {
  constructor(
    private applicantService: ApplicantService,
    private storageService: StorageService,
  ) {}

  @Get('me')
  getProfile(@CurrentUser() user: ApplicantEntity) {
    return this.applicantService.getProfile(user.id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: ApplicantEntity, @Body() dto: UpdateProfileDto) {
    return this.applicantService.updateProfile(user.id, dto);
  }

  @Post('me/o-level-results')
  saveOLevelResults(@CurrentUser() user: ApplicantEntity, @Body() dto: SaveResultsDto) {
    return this.applicantService.saveOLevelResults(user.id, dto);
  }

  @Post('me/a-level-results')
  saveALevelResults(@CurrentUser() user: ApplicantEntity, @Body() dto: SaveResultsDto) {
    return this.applicantService.saveALevelResults(user.id, dto);
  }

  @Post('me/documents/:type')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: ApplicantEntity,
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileRef = await this.storageService.upload(file, `applicants/${user.id}/documents`);
    return this.applicantService.saveDocument(
      user.id, type, fileRef, file.originalname, file.mimetype, file.size,
    );
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @CurrentUser() user: ApplicantEntity,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileRef = await this.storageService.upload(file, `applicants/${user.id}/photo`);
    await this.applicantService.updatePhotoUrl(user.id, fileRef);
    return { photoUrl: fileRef };
  }
}
