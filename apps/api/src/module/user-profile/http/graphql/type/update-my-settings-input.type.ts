import { Field, InputType } from '@nestjs/graphql';

// Exactly one field is required by the service; explicit null is invalid.
@InputType()
export class UpdateMySettingsInput {
  @Field(() => Boolean, { nullable: true })
  eventReminders?: boolean;

  @Field(() => Boolean, { nullable: true })
  exclusiveOffers?: boolean;

  @Field(() => Boolean, { nullable: true })
  ticketAvailability?: boolean;

  @Field(() => Boolean, { nullable: true })
  emailNotifications?: boolean;

  @Field(() => Boolean, { nullable: true })
  pushNotifications?: boolean;

  @Field(() => String, { nullable: true })
  language?: string;
}
