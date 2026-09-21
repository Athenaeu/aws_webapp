import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCodeEntity } from '../database/entities/promo-code.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';

@Injectable()
export class PromoCodeService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private promoRepo: Repository<PromoCodeEntity>,
  ) {}

  findAll() {
    return this.promoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(adminId: string, dto: CreatePromoCodeDto) {
    const existing = await this.promoRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new ConflictException('Promo code already exists');

    return this.promoRepo.save(
      this.promoRepo.create({
        ...dto,
        code: dto.code.toUpperCase(),
        createdByAdminId: adminId,
      }),
    );
  }

  async toggle(id: string, isActive: boolean) {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found');
    promo.isActive = isActive;
    return this.promoRepo.save(promo);
  }
}
