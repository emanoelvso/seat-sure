import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CodeSenderPurpose } from '@identityModule/core/adapter/code-sender.adapter.interface';
import { RegistrationService } from '@identityModule/core/service/registration.service';
import { VerificationCodeService } from '@identityModule/core/service/verification-code.service';
import { CodeDelivery } from '@identityModule/http/graphql/type/code-delivery.type';
import { ResendCodeInput } from '@identityModule/http/graphql/type/resend-code-input.type';
import { SessionTokens } from '@identityModule/http/graphql/type/session-tokens.type';
import { SignUpInput } from '@identityModule/http/graphql/type/sign-up-input.type';
import { SignUpResult } from '@identityModule/http/graphql/type/sign-up-result.type';
import { VerifyEmailInput } from '@identityModule/http/graphql/type/verify-email-input.type';

@Resolver()
export class IdentityResolver {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  @Mutation(() => SignUpResult)
  async signUp(@Args('input') input: SignUpInput): Promise<SignUpResult> {
    return this.registrationService.signUp(input, new Date());
  }

  @Mutation(() => SessionTokens)
  async verifyEmail(
    @Args('input') input: VerifyEmailInput,
  ): Promise<SessionTokens> {
    return this.registrationService.verifyEmail(input, new Date());
  }

  @Mutation(() => CodeDelivery)
  async resendCode(
    @Args('input') input: ResendCodeInput,
  ): Promise<CodeDelivery> {
    return this.verificationCodeService.resend(
      input.email,
      input.purpose as CodeSenderPurpose,
      new Date(),
    );
  }
}
