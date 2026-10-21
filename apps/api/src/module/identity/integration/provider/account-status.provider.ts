import { Injectable } from '@nestjs/common';
import { AccountDeletionRepository } from '@identityModule/persistence/repository/account-deletion.repository';
import { AccountStatusApi } from '@sharedModules/integration/interface/account-status.interface';

@Injectable()
export class AccountStatusProvider implements AccountStatusApi {
  constructor(private readonly accountDeletions: AccountDeletionRepository) {}

  async isDeleted(userId: string): Promise<boolean> {
    return this.accountDeletions.exists(userId);
  }
}
