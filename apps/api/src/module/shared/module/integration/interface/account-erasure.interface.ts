import { DiscoveryService } from '@nestjs/core';

export type AccountErasureBlocker = 'ACCOUNT_HAS_ACTIVE_ORDERS';

// A module that holds user data registers one provider implementing this
// contract and marks it with `@AccountErasure()`. Identity discovers them at
// runtime when it deletes an account.
export interface AccountEraser {
  readonly name: string;
  // A reason the account can't be deleted now; checked before anything changes
  findBlocker?(
    userId: string,
    now: Date,
  ): Promise<AccountErasureBlocker | null>;
  // Idempotent: re-running it after a partial success changes nothing already
  // erased. May throw; Identity keeps the deletion pending and retries.
  erase(userId: string): Promise<void>;
}

export const AccountErasure = DiscoveryService.createDecorator<void>();
