import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { PaymentCardModel } from '@billingModule/core/model/payment-card.model';

// No token and no fingerprint field, ever (CARD-02 AC 10)
@ObjectType('PaymentCard')
export class PaymentCard implements PaymentCardModel {
  @Field(() => ID)
  id: string;

  @Field()
  brand: string;

  @Field()
  last4: string;

  @Field(() => Int)
  expMonth: number;

  @Field(() => Int)
  expYear: number;

  @Field()
  holder: string;

  @Field()
  isDefault: boolean;

  @Field()
  expired: boolean;
}
