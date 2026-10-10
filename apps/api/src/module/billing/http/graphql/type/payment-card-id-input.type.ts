import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

// A plain string, not a validated UUID: a malformed id is CARD_NOT_FOUND
// like any other id the caller doesn't own (CARD-11 AC 10)
@InputType()
export class PaymentCardIdInput {
  @IsString()
  @Field()
  id: string;
}
