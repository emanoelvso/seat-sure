import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

// A PaymentMethod id made by Stripe.js in the browser. Card data never
// reaches the API in Stripe mode (GW-38).
@InputType()
export class AddPaymentMethodInput {
  @IsString()
  @Field()
  paymentMethodId: string;
}
