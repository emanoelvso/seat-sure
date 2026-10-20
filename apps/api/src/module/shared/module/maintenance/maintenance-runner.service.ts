import { Inject, Injectable } from '@nestjs/common';
import {
  BillingApi,
  TokenReconciliationSummary,
} from '@sharedModules/integration/interface/billing-integration.interface';
import {
  AccountDeletionRunSummary,
  IdentityApi,
} from '@sharedModules/integration/interface/identity-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

const FAILED = 1;
const OK = 0;

// One run of the scheduled maintenance command: finish part-failed account
// deletions, then detach orphan gateway tokens. The two jobs are independent,
// so one throwing never skips the other. Returns the process exit code.
@Injectable()
export class MaintenanceRunner {
  constructor(
    @Inject(IdentityApi) private readonly identityApi: IdentityApi,
    @Inject(BillingApi) private readonly billingApi: BillingApi,
    private readonly logger: AppLogger,
  ) {}

  async run(now: Date): Promise<number> {
    const deletions = await this.attempt('finish-account-deletions', () =>
      this.identityApi.finishPendingAccountDeletions(now),
    );
    const reconciliation = await this.attempt('reconcile-gateway-tokens', () =>
      this.billingApi.reconcileGatewayTokens(now),
    );

    this.logger.log('maintenance-finished', { deletions, reconciliation });

    return this.hasFailure(deletions, reconciliation) ? FAILED : OK;
  }

  // A thrown job is logged and reported as null, which counts as a failure
  private async attempt<T>(
    step: string,
    job: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await job();
    } catch (exception) {
      // The error class only: a message can carry a gateway id (REC AC 12)
      this.logger.error('maintenance-step-failed', {
        step,
        error: exception instanceof Error ? exception.name : 'UnknownError',
      });
      return null;
    }
  }

  private hasFailure(
    deletions: AccountDeletionRunSummary | null,
    reconciliation: TokenReconciliationSummary | null,
  ): boolean {
    return (
      deletions === null ||
      reconciliation === null ||
      deletions.failed > 0 ||
      reconciliation.failures > 0
    );
  }
}
