import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LogInInput {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field()
  rememberMe: boolean;
}
