import { Field, InputType } from '@nestjs/graphql';
import { ResendCodePurpose } from '@identityModule/http/graphql/type/resend-code-purpose.type';

@InputType()
export class ResendCodeInput {
  @Field()
  email: string;

  @Field(() => ResendCodePurpose)
  purpose: ResendCodePurpose;
}
