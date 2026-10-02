import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CurrentUser {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;
}
