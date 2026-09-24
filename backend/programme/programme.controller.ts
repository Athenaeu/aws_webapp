import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProgrammeService } from './programme.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { UpdateProgrammeDto } from './dto/update-programme.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '@sui/shared-types';

@ApiTags('programmes')
@Controller('programmes')
export class ProgrammeController {
  constructor(private programmeService: ProgrammeService) {}

  @Get()
  findAll() {
    return this.programmeService.findAllSchools();
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Post('schools')
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.programmeService.createSchool(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Post()
  createProgramme(@Body() dto: CreateProgrammeDto) {
    return this.programmeService.createProgramme(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Patch(':id')
  updateProgramme(@Param('id') id: string, @Body() dto: UpdateProgrammeDto) {
    return this.programmeService.updateProgramme(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @Delete(':id')
  deleteProgramme(@Param('id') id: string) {
    return this.programmeService.deleteProgramme(id);
  }
}
