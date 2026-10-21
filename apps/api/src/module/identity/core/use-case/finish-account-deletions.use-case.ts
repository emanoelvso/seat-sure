import { Injectable } from '@nestjs/common';
import { AccountErasureService } from '@identityModule/core/service/account-erasure.service';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { AccountDeletionRunSummary } from '@sharedModules/integration/interface/identity-integration.interface';

const PAGE_SIZE = 100;

// Finishes the deletions that a failed step left pending. Each one runs every
// erasure step again; a step that keeps failing leaves its deletion pending
// for the next run (PEND-03).
@Injectable()
export class FinishAccountDeletionsUseCase {
  constructor(
    private readonly erasure: AccountErasureService,
    private readonly accountDeletions: AccountDeletionRepository,
  ) {}

  async execute(now: Date): Promise<AccountDeletionRunSummary> {
    const summary: AccountDeletionRunSummary = {
      pending: 0,
      completed: 0,
      failed: 0,
    };

    // A deletion that keeps failing stays pending, so walk forward by user id
    let afterUserId: string | null = null;
    for (;;) {
      const userIds = await this.accountDeletions.listPendingUserIds(
        afterUserId,
        PAGE_SIZE,
      );
      for (const userId of userIds) {
        summary.pending += 1;
        const { failedSteps } = await this.erasure.erase(userId, now);
        if (failedSteps.length === 0) {
          summary.completed += 1;
        } else {
          summary.failed += 1;
        }
      }
      if (userIds.length < PAGE_SIZE) {
        return summary;
      }
      afterUserId = userIds[userIds.length - 1];
    }
  }
}
