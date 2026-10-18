import { randomUUID } from 'crypto';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import {
  SessionService,
  SessionTokensResult,
} from '@identityModule/core/service/session.service';
import { IdentityUser } from '@identityModule/persistence/entity/identity-user.entity';
import { UserRepository } from '@identityModule/persistence/repository/user.repository';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { UserProfileApi } from '@sharedModules/integration/interface/user-profile-integration.interface';

@Injectable()
export class DemoAuthenticationService {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UserRepository,
    @Inject(UserProfileApi) private readonly profiles: UserProfileApi,
    private readonly sessions: SessionService,
  ) {}

  async signIn(now: Date): Promise<SessionTokensResult> {
    if (!this.config.get('demo.enabled'))
      throw new IdentityException('DEMO_DISABLED', 'Demo sign-in is disabled.');
    let user: IdentityUser | undefined;
    try {
      user = await this.users.save(
        new IdentityUser({
          email: `${randomUUID()}@demo.invalid`,
          passwordHash: await bcrypt.hash(randomUUID(), 10),
          emailVerifiedAt: now,
          lastLoginAt: now,
          createdAt: now,
        }),
      );
      await this.profiles.createProfile({
        userId: user.id,
        firstName: 'Demo',
        lastName: 'Visitor',
      });
      return await this.sessions.start(user.id, false, now);
    } catch {
      if (user) await this.users.hardDeleteById(user.id);
      throw new InternalServerErrorException(
        'Something went wrong. Please try again.',
      );
    }
  }
}
