import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  CheckoutEventModel,
  CheckoutOrderItemModel,
  CheckoutOrderModel,
  CheckoutOrderStatus,
  CheckoutTicketTypeModel,
} from '@ticketingModule/core/model/checkout-order.model';
import { PaymentAction } from './payment-action.type';

registerEnumType(CheckoutOrderStatus, { name: 'CheckoutOrderStatus' });

@ObjectType()
export class CheckoutEvent implements CheckoutEventModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  startAt: Date;

  @Field()
  coverImage: string;

  @Field()
  venue: string;

  @Field()
  city: string;

  @Field()
  country: string;
}

@ObjectType()
export class CheckoutTicketType implements CheckoutTicketTypeModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

@ObjectType()
export class CheckoutOrderItem implements CheckoutOrderItemModel {
  @Field()
  seatId: string;

  @Field()
  row: string;

  @Field()
  number: string;
}

@ObjectType()
export class CheckoutOrder implements CheckoutOrderModel {
  @Field(() => ID)
  id: string;

  @Field(() => CheckoutOrderStatus)
  status: CheckoutOrderStatus;

  @Field()
  expiresAt: Date;

  @Field(() => Int)
  secondsLeft: number;

  @Field(() => Int)
  quantity: number;

  @Field()
  currency: string;

  @Field(() => Int)
  subtotalCents: number;

  @Field(() => Int)
  serviceFeeCents: number;

  @Field(() => Int)
  taxCents: number;

  @Field(() => Int)
  totalCents: number;

  @Field(() => Int)
  unitPriceCents: number;

  @Field(() => Int)
  unitServiceFeeCents: number;

  @Field(() => Int)
  unitTaxCents: number;

  @Field(() => CheckoutEvent)
  event: CheckoutEvent;

  @Field(() => CheckoutTicketType)
  ticketType: CheckoutTicketType;

  @Field(() => [CheckoutOrderItem])
  items: CheckoutOrderItem[];

  @Field(() => PaymentAction, { nullable: true })
  paymentAction?: PaymentAction | null;
}
