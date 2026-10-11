import { Injectable } from '@nestjs/common';
import { BillingException } from '@billingModule/core/exception/billing.exception';
import { CardThrottleRepository } from '@billingModule/persistence/repository/card-throttle.repository';
import { Propagation, Transactional } from 'typeorm-transactional';

// Slows card testing (AD-028): 5 failed card attempts of one user within 15
// minutes lock card adds and saved-card charges for 15 minutes.
@Injectable()
export class CardThrottleService {
  constructor(
    private readonly cardThrottleRepository: CardThrottleRepository,
  ) {}

  async assertNotLocked(userId: string, now: Date): Promise<void> {
    const row = await this.cardThrottleRepository.findByUserId(userId);
    if (row?.lockedUntil && now.getTime() < row.lockedUntil.getTime()) {
      throw new BillingException(
        'CARD_ATTEMPTS_LIMITED',
        'Too many card attempts. Try again in 15 minutes.',
      );
    }
  }

  // REQUIRES_NEW: a failure is recorded even though the operation throws
  // right after, which would otherwise roll the write back with the
  // enclosing transaction.
  @Transactional({
    connectionName: 'billing',
    propagation: Propagation.REQUIRES_NEW,
  })
  async recordFailure(userId: string, now: Date): Promise<void> {
    await this.cardThrottleRepository.recordFailure(userId, now);
  }

  @Transactional({
    connectionName: 'billing',
    propagation: Propagation.REQUIRES_NEW,
  })
  async clear(userId: string): Promise<void> {
    await this.cardThrottleRepository.clear(userId);
  }
}
