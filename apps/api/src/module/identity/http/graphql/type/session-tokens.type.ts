import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SessionTokens {
  @Field()
  accessToken: string;

  @Field(() => String, { nullable: true })
  refreshToken: string | null;

  @Field()
  expiresAt: Date;

  @Field()
  persistent: boolean;
}
