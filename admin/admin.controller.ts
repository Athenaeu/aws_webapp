import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '@sui/shared-types';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin-users')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Roles(AdminRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.update(id, dto);
  }

  // Any authenticated admin can change their own password
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER, AdminRole.SCHOOL_REVIEWER, AdminRole.AUDITOR)
  @Patch('me/password')
  changePassword(
    @CurrentUser() admin: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.adminService.changePassword(admin.id, body.currentPassword, body.newPassword);
  }

  // Broadcast email to all applicants (officers and above)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
  @Post('broadcast')
  broadcast(
    @CurrentUser() admin: any,
    @Body() body: { subject: string; message: string; targetStatus?: string },
  ) {
    return this.adminService.broadcast(admin.id, body.subject, body.message, body.targetStatus);
  }
}
