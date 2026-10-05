import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ResetPasswordInput {
  @Field()
  resetToken: string;

  @Field()
  newPassword: string;
}
