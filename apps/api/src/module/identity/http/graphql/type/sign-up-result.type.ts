import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignUpResult {
  @Field()
  email: string;

  @Field()
  codeSent: boolean;

  @Field()
  resendAvailableAt: Date;
}
