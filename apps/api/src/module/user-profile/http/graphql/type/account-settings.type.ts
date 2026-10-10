import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccountSettings {
  @Field(() => Boolean)
  eventReminders: boolean;

  @Field(() => Boolean)
  exclusiveOffers: boolean;

  @Field(() => Boolean)
  ticketAvailability: boolean;

  @Field(() => Boolean)
  emailNotifications: boolean;

  @Field(() => Boolean)
  pushNotifications: boolean;

  @Field(() => String)
  language: string;
}
