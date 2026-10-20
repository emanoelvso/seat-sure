// What one run of `finishPendingAccountDeletions` did: the pending deletions
// it found, how many it completed and how many are still pending after a
// failed step.
export interface AccountDeletionRunSummary {
  pending: number;
  completed: number;
  failed: number;
}

export interface IdentityApi {
  findAccountEmail(userId: string): Promise<string | null>;
  // Re-runs the erasure of every pending account deletion (PEND-03)
  finishPendingAccountDeletions(now: Date): Promise<AccountDeletionRunSummary>;
}

export const IdentityApi = Symbol('IdentityApi');
