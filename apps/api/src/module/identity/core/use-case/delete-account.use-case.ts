import { Injectable } from '@nestjs/common';
import { AccountErasureService } from '@identityModule/core/service/account-erasure.service';
import { SessionService } from '@identityModule/core/service/session.service';
import { IdentityException } from '@identityModule/core/exception/identity.exception';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { Transactional } from 'typeorm-transactional';

const CONFIRMATION = 'DELETE';

// Deletes the signed-in user's account. The request is recorded and every
// session revoked before any module erases data, so a failure part-way leaves
// an account nobody can use, finished later by the maintenance command.
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    private readonly erasure: AccountErasureService,
    private readonly sessions: SessionService,
    private readonly accountDeletions: AccountDeletionRepository,
  ) {}

  async execute(
    userId: string,
    confirmation: string,
    now: Date,
  ): Promise<true> {
    if (confirmation.trim() !== CONFIRMATION) {
      throw new IdentityException(
        'DELETION_NOT_CONFIRMED',
        `Type ${CONFIRMATION} to confirm.`,
      );
    }

    if (await this.erasure.findBlocker(userId, now)) {
      throw new IdentityException(
        'ACCOUNT_HAS_ACTIVE_ORDERS',
        "You can't delete your account while you have an order in progress or tickets for an upcoming event.",
      );
    }

    await this.recordRequest(userId, now);

    // A failed step is logged and retried by the maintenance command; the
    // account is already unusable, so the caller still gets success (PEND-01)
    await this.erasure.erase(userId, now);
    return true;
  }

  @Transactional({ connectionName: 'identity' })
  private async recordRequest(userId: string, now: Date): Promise<void> {
    await this.accountDeletions.insertPending(
      this.accountDeletions.entityManager,
      userId,
      now,
    );
    await this.sessions.revokeAll(userId, now);
  }
}
