import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CodeDelivery {
  @Field()
  codeSent: boolean;

  @Field()
  resendAvailableAt: Date;
}
