import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RegistrationService } from '@identityModule/core/service/registration.service';
import { SessionTokens } from '@identityModule/http/graphql/type/session-tokens.type';
import { SignUpInput } from '@identityModule/http/graphql/type/sign-up-input.type';
import { SignUpResult } from '@identityModule/http/graphql/type/sign-up-result.type';
import { VerifyEmailInput } from '@identityModule/http/graphql/type/verify-email-input.type';

@Resolver()
export class IdentityResolver {
  constructor(private readonly registrationService: RegistrationService) {}

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
}
