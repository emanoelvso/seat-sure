import { Module } from '@nestjs/common';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { LogCodeSender } from '@identityModule/integration/provider/log-code-sender.provider';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';

@Module({
  imports: [IdentityPersistenceModule, UserProfileModule, LoggerModule],
  providers: [{ provide: CodeSender, useClass: LogCodeSender }],
})
export class IdentityModule {}
