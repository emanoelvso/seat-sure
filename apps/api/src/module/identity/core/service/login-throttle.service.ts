import { Injectable } from '@nestjs/common';
import { normalizeEmail } from '@identityModule/core/model/credential-rules.model';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { LoginThrottleRepository } from '@identityModule/persistence/repository/login-throttle.repository';
import { Propagation, Transactional } from 'typeorm-transactional';

@Injectable()
export class LoginThrottleService {
  constructor(
    private readonly loginThrottleRepository: LoginThrottleRepository,
  ) {}

  async assertNotLocked(email: string, now: Date): Promise<void> {
    const row = await this.loginThrottleRepository.findByEmail(
      normalizeEmail(email),
    );
    if (row?.lockedUntil && now.getTime() < row.lockedUntil.getTime()) {
      throw new IdentityException(
        'LOGIN_LOCKED',
        'Too many attempts. Try again in 15 minutes.',
      );
    }
  }

  // REQUIRES_NEW: a login failure is recorded even though `logIn` throws
  // right after this call, which would otherwise roll back the write along
  // with everything else in the enclosing transaction.
  @Transactional({
    connectionName: 'identity',
    propagation: Propagation.REQUIRES_NEW,
  })
  async recordFailure(email: string, now: Date): Promise<void> {
    await this.loginThrottleRepository.recordFailure(
      normalizeEmail(email),
      now,
    );
  }

  @Transactional({
    connectionName: 'identity',
    propagation: Propagation.REQUIRES_NEW,
  })
  async clear(email: string): Promise<void> {
    await this.loginThrottleRepository.clear(normalizeEmail(email));
  }
}
