import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole, ApplicationStatus } from '@sui/shared-types';
import { ApplicantEntity } from '../database/entities/applicant.entity';

@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  constructor(private appService: ApplicationService) {}

  // Applicant routes
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: ApplicantEntity, @Body() dto: CreateApplicationDto) {
    return this.appService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  myApplications(@CurrentUser() user: ApplicantEntity) {
    return this.appService.findByApplicant(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine/:id')
  myApplication(@CurrentUser() user: ApplicantEntity, @Param('id') id: string) {
    return this.appService.findOne(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('mine/:id/submit')
  submit(@CurrentUser() user: ApplicantEntity, @Param('id') id: string) {
    return this.appService.submit(user.id, id);
  }

  // Public tracking
  @Get('track')
  track(
    @Query('number') applicationNumber: string,
    @Query('contact') contact: string,
  ) {
    return this.appService.trackByNumber(applicationNumber, contact);
  }

  // Admin routes
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER, AdminRole.SCHOOL_REVIEWER)
  @Get('admin/stats')
  async adminStats() {
    return this.appService.getStats();
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER, AdminRole.SCHOOL_REVIEWER)
  @Get('admin')
  async adminList(
    @Query('status') status?: ApplicationStatus,
    @Query('schoolId') schoolId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const [data, total] = await this.appService.findAll({
      status, schoolId, search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { data, total };
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Patch('admin/bulk-review')
  async bulkReview(@CurrentUser() admin: any, @Body() body: { ids: string[]; action: 'approve' | 'reject' | 'query'; note?: string }) {
    return this.appService.bulkReview(admin.id, body.ids, body.action, body.note);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER, AdminRole.SCHOOL_REVIEWER)
  @Get('admin/:id')
  adminGetOne(@Param('id') id: string) {
    return this.appService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Patch('admin/:id/force-submit')
  forceSubmit(@CurrentUser() admin: any, @Param('id') id: string) {
    return this.appService.forceSubmit(admin.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER, AdminRole.SCHOOL_REVIEWER)
  @Patch('admin/:id/review')
  review(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.appService.review(admin.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Patch('admin/:id/admit')
  admit(@CurrentUser() admin: any, @Param('id') id: string, @Body() body: { admittedProgrammeId?: string }) {
    return this.appService.admit(admin.id, id, body.admittedProgrammeId);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Post('admin/:id/send-letter')
  sendAdmissionLetter(@Param('id') id: string) {
    return this.appService.sendAdmissionLetter(id);
  }
}
