import { DemoAuthenticationService } from '@identityModule/core/service/demo-authentication.service';
import { DemoEmailGuard } from '@identityModule/http/guard/demo-email.guard';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CodeSenderPurpose } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { AuthenticationService } from '@identityModule/core/service/authentication.service';
import { PasswordResetService } from '@identityModule/core/service/password-reset.service';
import { RegistrationService } from '@identityModule/core/service/registration.service';
import { SessionService } from '@identityModule/core/service/session.service';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { CodeDelivery } from '@identityModule/http/graphql/type/code-delivery.type';
import { ConfirmPasswordResetCodeInput } from '@identityModule/http/graphql/type/confirm-password-reset-code-input.type';
import { CurrentUser } from '@identityModule/http/graphql/type/current-user.type';
import { LogInInput } from '@identityModule/http/graphql/type/log-in-input.type';
import { LogInResult } from '@identityModule/http/graphql/type/log-in-result.type';
import { PasswordResetGrant } from '@identityModule/http/graphql/type/password-reset-grant.type';
import { RefreshSessionInput } from '@identityModule/http/graphql/type/refresh-session-input.type';
import { RequestPasswordResetInput } from '@identityModule/http/graphql/type/request-password-reset-input.type';
import { ResetPasswordInput } from '@identityModule/http/graphql/type/reset-password-input.type';
import { ResendCodeInput } from '@identityModule/http/graphql/type/resend-code-input.type';
import { ResendCodePurpose } from '@identityModule/http/graphql/type/resend-code-purpose.type';
import { SessionTokens } from '@identityModule/http/graphql/type/session-tokens.type';
import { SignUpInput } from '@identityModule/http/graphql/type/sign-up-input.type';
import { SignUpResult } from '@identityModule/http/graphql/type/sign-up-result.type';
import { VerifyEmailInput } from '@identityModule/http/graphql/type/verify-email-input.type';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';

// Maps the GraphQL-facing enum to the internal purpose string the identity
// module's services and persistence layer use everywhere else.
const RESEND_CODE_PURPOSE_MAP: Record<ResendCodePurpose, CodeSenderPurpose> = {
  [ResendCodePurpose.VERIFY_EMAIL]: 'verify_email',
  [ResendCodePurpose.RESET_PASSWORD]: 'reset_password',
};

@Resolver()
export class IdentityResolver {
  constructor(
    private readonly demoAuthenticationService: DemoAuthenticationService,
    private readonly registrationService: RegistrationService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly authenticationService: AuthenticationService,
    private readonly sessionService: SessionService,
    private readonly passwordResetService: PasswordResetService,
    private readonly clsService: ClsService,
  ) {}

  @Mutation(() => SessionTokens)
  async demoSignIn(): Promise<SessionTokens> {
    return this.demoAuthenticationService.signIn(new Date());
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => SignUpResult)
  async signUp(@Args('input') input: SignUpInput): Promise<SignUpResult> {
    return this.registrationService.signUp(input, new Date());
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => SessionTokens)
  async verifyEmail(
    @Args('input') input: VerifyEmailInput,
  ): Promise<SessionTokens> {
    return this.registrationService.verifyEmail(input, new Date());
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => CodeDelivery)
  async resendCode(
    @Args('input') input: ResendCodeInput,
  ): Promise<CodeDelivery> {
    return this.verificationCodeService.resend(
      input.email,
      RESEND_CODE_PURPOSE_MAP[input.purpose],
      new Date(),
    );
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => LogInResult)
  async logIn(@Args('input') input: LogInInput): Promise<LogInResult> {
    return this.authenticationService.logIn(input, new Date());
  }

  @Mutation(() => SessionTokens)
  async refreshSession(
    @Args('input') input: RefreshSessionInput,
  ): Promise<SessionTokens> {
    return this.sessionService.rotate(input.refreshToken, new Date());
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => CodeDelivery)
  async requestPasswordReset(
    @Args('input') input: RequestPasswordResetInput,
  ): Promise<CodeDelivery> {
    return this.passwordResetService.requestReset(input.email, new Date());
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => PasswordResetGrant)
  async confirmPasswordResetCode(
    @Args('input') input: ConfirmPasswordResetCodeInput,
  ): Promise<PasswordResetGrant> {
    return this.passwordResetService.confirmCode(
      input.email,
      input.code,
      new Date(),
    );
  }

  @UseGuards(DemoEmailGuard)
  @Mutation(() => Boolean)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<boolean> {
    await this.passwordResetService.resetPassword(
      input.resetToken,
      input.newPassword,
      new Date(),
    );
    return true;
  }

  @UseGuards(AuthGuard)
  @Query(() => CurrentUser)
  async me(): Promise<CurrentUser> {
    const userId = this.clsService.get<string>('userId');
    const sessionId = this.clsService.get<string>('sessionId');
    return this.authenticationService.findCurrentUser(
      userId,
      sessionId,
      new Date(),
    );
  }
}
