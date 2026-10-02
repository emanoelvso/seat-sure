import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ResendCodeInput {
  @Field()
  email: string;

  @Field()
  purpose: string;
}
