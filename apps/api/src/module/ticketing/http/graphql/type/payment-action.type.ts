import { Field, ObjectType } from '@nestjs/graphql';
import { PaymentAction as PaymentActionModel } from '@sharedModules/integration/interface/billing-integration.interface';

// What the buyer's browser needs to finish a 3-D Secure challenge. Only the
// order's owner ever receives it (GW-32).
@ObjectType()
export class PaymentAction implements PaymentActionModel {
  @Field(() => String)
  provider: 'simulated' | 'stripe';

  @Field()
  clientSecret: string;
}
