import { Field, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Shape only: the card rules run in OrderPaymentService, so a bad card comes
// back as INVALID_CARD with its fields, not BAD_REQUEST (AD-018).
@InputType()
export class CardInput {
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

// Exactly one of `card` (a typed card), `savedCardId` (one of the caller's
// saved cards) and `paymentMethodId`; OrderPaymentService rejects anything
// else.
@InputType()
export class PayOrderInput {
  @IsString()
  @Field()
  orderId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardInput)
  @Field(() => CardInput, { nullable: true })
  card?: CardInput | null;

  @IsOptional()
  @IsString()
  @Field(() => ID, { nullable: true })
  savedCardId?: string | null;

  // A PaymentMethod id made by Stripe.js (Stripe mode only, GW-38)
  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  paymentMethodId?: string | null;

  // Save the card once the order is paid (CARD-09)
  @IsOptional()
  @IsBoolean()
  @Field({ defaultValue: false })
  saveCard: boolean;
}
