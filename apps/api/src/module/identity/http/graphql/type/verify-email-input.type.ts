import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class VerifyEmailInput {
  @Field()
  email: string;

  @Field()
  code: string;

  @Field()
  rememberMe: boolean;
}
