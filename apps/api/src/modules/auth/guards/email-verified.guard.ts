import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException(
        'EmailVerifiedGuard requer JwtAuthGuard antes dele na cadeia.',
      );
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Confirme seu email antes de continuar. Verifique sua caixa de entrada.',
      );
    }

    return true;
  }
}