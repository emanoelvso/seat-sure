import { Global, Module } from '@nestjs/common';
import { AccountStatusProvider } from '@identityModule/integration/provider/account-status.provider';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { AccountStatusApi } from '@sharedModules/integration/interface/account-status.interface';

// Global so the shared `AuthGuard`, which every module uses, can ask whether a
// user is deleted without importing Identity. The guard injects it optionally.
@Global()
@Module({
  imports: [IdentityPersistenceModule],
  providers: [{ provide: AccountStatusApi, useClass: AccountStatusProvider }],
  exports: [AccountStatusApi],
})
export class IdentityAccountStatusModule {}
