import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserEntity } from '../../database/entities/admin-user.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(AdminUserEntity)
    private adminRepo: Repository<AdminUserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; type: string; role: string; schoolId: string | null }) {
    if (payload.type !== 'admin') throw new UnauthorizedException();
    const admin = await this.adminRepo.findOne({ where: { id: payload.sub, isActive: true } });
    if (!admin) throw new UnauthorizedException();
    return admin;
  }
}
