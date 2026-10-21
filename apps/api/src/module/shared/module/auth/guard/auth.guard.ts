import {
  CanActivate,
  ContextType,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { AccountStatusApi } from '@sharedModules/integration/interface/account-status.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly clsService: ClsService,
    private readonly configService: ConfigService,
    // Absent in apps that don't load Identity; those keep the JWT-only check
    @Optional()
    @Inject(AccountStatusApi)
    private readonly accountStatus?: AccountStatusApi,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = await this.getRequest(context);
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('auth.jwtSecret'),
      });
      // Otherwise a deleted account's access token lives out its 15 minutes
      if (await this.accountStatus?.isDeleted(payload.sub)) {
        throw new UnauthorizedException();
      }

      this.clsService.set('userId', payload.sub);
      this.clsService.set('sessionId', payload.sid);
      this.clsService.set('userToken', token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
  private async getRequest(context: ExecutionContext): Promise<Request> {
    try {
      if (context.getType<ContextType | 'graphql'>() === 'graphql') {
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;
        return req as Request;
      }
      const req = context.switchToHttp().getRequest<Request>();

      return req;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.get('Authorization')?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
