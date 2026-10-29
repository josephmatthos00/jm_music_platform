import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException(
        'AdminGuard requer JwtAuthGuard antes dele na cadeia.',
      );
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}