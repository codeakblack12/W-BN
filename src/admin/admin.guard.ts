import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { jwtConstants } from 'src/auth/constants';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/auth/schemas/auth.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(
        token,
        {
          secret: jwtConstants.secret
        }
      );
      if(payload.platform !== "WEB"){
        throw new UnauthorizedException();
      }

      const user = await this.authService.getUserFromAuthenticationToken(token)

      if(
        !user.role.includes(Role.SUPER_ADMIN) && !user.role.includes(Role.ADMIN) && !user.role.includes(Role.MANAGER)
      ){
        throw new UnauthorizedException();
      }

      request['user'] = user;

    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

}
