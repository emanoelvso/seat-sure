import { inspect } from 'util';
import { Test } from '@nestjs/testing';
import { MaintenanceRunner } from '@sharedModules/maintenance/maintenance-runner.service';
import {
  BillingApi,
  TokenReconciliationSummary,
} from '@sharedModules/integration/interface/billing-integration.interface';
import {
  AccountDeletionRunSummary,
  IdentityApi,
} from '@sharedModules/integration/interface/identity-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

const NOW = new Date('2026-10-20T12:00:00Z');

const cleanDeletions: AccountDeletionRunSummary = {
  pending: 2,
  completed: 2,
  failed: 0,
};
const cleanReconciliation: TokenReconciliationSummary = {
  customersScanned: 3,
  methodsScanned: 7,
  orphansDetached: 1,
  recentSkipped: 2,
  missingCustomers: 0,
  failures: 0,
};

describe('MaintenanceRunner (integration)', () => {
  let runner: MaintenanceRunner;
  let finishPendingAccountDeletions: jest.Mock;
  let reconcileGatewayTokens: jest.Mock;
  let logger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(async () => {
    finishPendingAccountDeletions = jest.fn().mockResolvedValue(cleanDeletions);
    reconcileGatewayTokens = jest.fn().mockResolvedValue(cleanReconciliation);
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        MaintenanceRunner,
        { provide: IdentityApi, useValue: { finishPendingAccountDeletions } },
        { provide: BillingApi, useValue: { reconcileGatewayTokens } },
        { provide: AppLogger, useValue: logger },
      ],
    }).compile();
    runner = module.get(MaintenanceRunner);
  });

  const summaryLog = () =>
    logger.log.mock.calls.find(
      ([message]) => message === 'maintenance-finished',
    )?.[1];

  it('returns 0 and runs both jobs with the run time when nothing failed', async () => {
    const exitCode = await runner.run(NOW);

    expect(exitCode).toBe(0);
    expect(finishPendingAccountDeletions).toHaveBeenCalledWith(NOW);
    expect(reconcileGatewayTokens).toHaveBeenCalledWith(NOW);
  });

  it('returns 1 when a pending deletion is still failing (PEND-03 AC 5)', async () => {
    finishPendingAccountDeletions.mockResolvedValue({
      pending: 2,
      completed: 1,
      failed: 1,
    });

    const exitCode = await runner.run(NOW);

    expect(exitCode).toBe(1);
    expect(reconcileGatewayTokens).toHaveBeenCalledTimes(1);
  });

  it('returns 1 when the reconciliation counted a failure (REC AC 9)', async () => {
    reconcileGatewayTokens.mockResolvedValue({
      ...cleanReconciliation,
      failures: 1,
    });

    const exitCode = await runner.run(NOW);

    expect(exitCode).toBe(1);
  });

  it('still reconciles tokens and returns 1 when finishing deletions throws', async () => {
    finishPendingAccountDeletions.mockRejectedValue(new Error('db down'));

    const exitCode = await runner.run(NOW);

    expect(exitCode).toBe(1);
    expect(reconcileGatewayTokens).toHaveBeenCalledTimes(1);
  });

  it('still finishes deletions and returns 1 when the reconciliation throws', async () => {
    reconcileGatewayTokens.mockRejectedValue(new Error('stripe down'));

    const exitCode = await runner.run(NOW);

    expect(exitCode).toBe(1);
    expect(finishPendingAccountDeletions).toHaveBeenCalledTimes(1);
  });

  it('logs one summary carrying both job summaries (REC AC 8)', async () => {
    await runner.run(NOW);

    expect(summaryLog()).toEqual({
      deletions: cleanDeletions,
      reconciliation: cleanReconciliation,
    });
  });

  it('logs a null summary for the job that threw', async () => {
    reconcileGatewayTokens.mockRejectedValue(new Error('stripe down'));

    await runner.run(NOW);

    expect(summaryLog()).toEqual({
      deletions: cleanDeletions,
      reconciliation: null,
    });
  });

  it('never logs a gateway id carried by the failure of a job (REC AC 12)', async () => {
    reconcileGatewayTokens.mockRejectedValue(
      new Error('refused cus_secret123 pm_secret456'),
    );

    await runner.run(NOW);

    const output = inspect(logger.error.mock.calls, { depth: 6 });
    expect(logger.error).toHaveBeenCalledWith(
      'maintenance-step-failed',
      expect.objectContaining({ step: 'reconcile-gateway-tokens' }),
    );
    expect(output).not.toContain('cus_secret123');
    expect(output).not.toContain('pm_secret456');
  });
});
