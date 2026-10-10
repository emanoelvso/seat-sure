import { Field, ID, ObjectType } from '@nestjs/graphql';
import { UserProfileModel } from '@userProfileModule/core/model/user-profile.model';

@ObjectType('UserProfile')
export class UserProfile implements UserProfileModel {
  @Field(() => ID)
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;

  @Field(() => String, { nullable: true })
  state: string | null;

  @Field(() => String, { nullable: true })
  city: string | null;

  @Field(() => String, { nullable: true })
  birthDate: string | null;

  @Field(() => String, { nullable: true })
  phoneCountryCode: string | null;

  @Field(() => String, { nullable: true })
  phoneNumber: string | null;

  @Field(() => String, { nullable: true })
  zipCode: string | null;
}
