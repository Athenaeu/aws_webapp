import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PromoCodeService } from './promo-code.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '@sui/shared-types';
import { IsBoolean } from 'class-validator';

class ToggleDto { @IsBoolean() isActive: boolean; }

@ApiTags('promo-codes')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMISSIONS_OFFICER)
@Controller('promo-codes')
export class PromoCodeController {
  constructor(private promoService: PromoCodeService) {}

  @Get()
  findAll() {
    return this.promoService.findAll();
  }

  @Post()
  create(@CurrentUser() admin: any, @Body() dto: CreatePromoCodeDto) {
    return this.promoService.create(admin.id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Body() dto: ToggleDto) {
    return this.promoService.toggle(id, dto.isActive);
  }
}
