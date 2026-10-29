import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

const USER_CACHE_TTL = 300; // 5 minutos

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Rejeita tokens sem identificador de usuário antes de consultar o banco.
    if (!payload?.sub) {
      throw new UnauthorizedException('Token sem identificador de usuário');
    }

    const cacheKey = `jwt:user:${payload.sub}`;

    try {
      const cached = await this.redis.get<any>(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis fora do ar: cai para o banco
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    void this.redis
      .setex(cacheKey, USER_CACHE_TTL, user)
      .catch(() => undefined);

    return user;
  }
}