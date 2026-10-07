import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

// Shape only: the card rules run in PaymentCardService, so a bad card comes
// back as INVALID_CARD with its fields, not BAD_REQUEST (AD-018).
@InputType()
export class AddPaymentCardInput {
  @IsString()
  @Field()
  number: string;

  @IsString()
  @Field()
  holder: string;

  @IsString()
  @Field()
  expiry: string;

  @IsString()
  @Field()
  cvv: string;
}
