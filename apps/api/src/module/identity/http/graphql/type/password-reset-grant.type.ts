import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PasswordResetGrant {
  @Field()
  resetToken: string;

  @Field()
  expiresAt: Date;
}
