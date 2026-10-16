import { ConfigService } from '@sharedModules/config/service/config.service';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { DisabledCodeSender } from '@identityModule/integration/provider/disabled-code-sender.provider';
import { Module } from '@nestjs/common';
import { CodeSender } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { SecurityAlertSender } from '@identityModule/core/adapter/security-alert-sender.adapter.interface';
import { AuthenticationService } from '@identityModule/core/service/authentication.service';
import { LoginThrottleService } from '@identityModule/core/service/login-throttle.service';
import { PasswordResetService } from '@identityModule/core/service/password-reset.service';
import { RegistrationService } from '@identityModule/core/service/registration.service';
import { SessionService } from '@identityModule/core/service/session.service';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { IdentityResolver } from '@identityModule/http/graphql/identity.resolver';
import { IdentityPersistenceModule } from '@identityModule/persistence/identity-persistence.module';
import { LogCodeSender } from '@identityModule/integration/provider/log-code-sender.provider';
import { LogSecurityAlertSender } from '@identityModule/integration/provider/log-security-alert-sender.provider';
import { IdentityPublicApiProvider } from '@identityModule/integration/provider/public-api.provider';
import { IdentityApi } from '@sharedModules/integration/interface/identity-integration.interface';
import { AuthModule } from '@sharedModules/auth/auth.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { NotificationsModule } from '@notificationsModule/notifications.module';
import { UserProfileModule } from '@userProfileModule/user-profile.module';

@Module({
  imports: [
    IdentityPersistenceModule,
    UserProfileModule,
    NotificationsModule,
    LoggerModule,
    AuthModule,
  ],
  providers: [
    {
      provide: CodeSender,
      inject: [ConfigService, AppLogger],
      useFactory: (config: ConfigService, logger: AppLogger): CodeSender =>
        config.get('auth.codeSender') === 'disabled'
          ? new DisabledCodeSender()
          : new LogCodeSender(logger),
    },
    { provide: SecurityAlertSender, useClass: LogSecurityAlertSender },
    { provide: IdentityApi, useClass: IdentityPublicApiProvider },
    VerificationCodeService,
    RegistrationService,
    SessionService,
    LoginThrottleService,
    AuthenticationService,
    PasswordResetService,
    IdentityResolver,
  ],
  exports: [IdentityApi],
})
export class IdentityModule {}
