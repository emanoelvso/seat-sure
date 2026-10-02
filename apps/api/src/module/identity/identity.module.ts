import { Module } from '@nestjs/common';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { RegistrationService } from '@identityModule/core/service/registration.service';
import { SessionService } from '@identityModule/core/service/session.service';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { IdentityResolver } from '@identityModule/http/graphql/identity.resolver';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { LogCodeSender } from '@identityModule/integration/provider/log-code-sender.provider';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';

@Module({
  imports: [
    IdentityPersistenceModule,
    UserProfileModule,
    LoggerModule,
    AuthModule,
  ],
  providers: [
    { provide: CodeSender, useClass: LogCodeSender },
    VerificationCodeService,
    RegistrationService,
    SessionService,
    IdentityResolver,
  ],
})
export class IdentityModule {}
