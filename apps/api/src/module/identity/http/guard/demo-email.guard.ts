import { CanActivate, Injectable } from '@nestjs/common';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { ConfigService } from '@sharedModules/config/service/config.service';

@Injectable()
export class DemoEmailGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get('demo.enabled')) {
      throw new IdentityException(
        'DEMO_ONLY',
        'Use demo sign-in to explore this application.',
      );
    }
    return true;
  }
}
