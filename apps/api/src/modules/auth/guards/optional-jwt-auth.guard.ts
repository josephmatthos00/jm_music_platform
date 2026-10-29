import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que permite anônimo, mas valida o token SE presente.
 *
 * - Sem header `Authorization` → libera como anônimo (`req.user = null`)
 * - Com header `Bearer` válido → popula `req.user`
 * - Com header malformado (sem `Bearer `, vazio, etc.) → 401
 * - Com token inválido/expirado → 401
 *
 * Use em rotas que aceitam visitante (ex.: preview de faixa).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    // Sem header → anônimo
    if (!authHeader) {
      request.user = null;
      return true;
    }

    // Header presente mas malformado → 401
    if (!authHeader.startsWith('Bearer ') || authHeader === 'Bearer ') {
      throw new UnauthorizedException('Token de autorização malformado');
    }

    // Header bem formado → valida normalmente. Se inválido, 401 sobe.
    return (await super.canActivate(context)) as boolean;
  }
}