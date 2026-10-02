import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConfirmPasswordResetCodeInput {
  @Field()
  email: string;

  @Field()
  code: string;
}
