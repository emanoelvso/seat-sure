import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  AccountOrderCountsModel,
  AccountOrderDetailModel,
  AccountOrderEventModel,
  AccountOrderItemModel,
  AccountOrderPaymentCardModel,
  AccountOrdersPageModel,
  AccountOrderStatus,
  AccountOrderSummaryModel,
} from '@ticketingModule/core/model/account-order.model';

registerEnumType(AccountOrderStatus, { name: 'AccountOrderStatus' });

@ObjectType()
export class AccountOrderSummary implements AccountOrderSummaryModel {
  @Field(() => ID)
  id: string;

  @Field(() => AccountOrderStatus)
  status: AccountOrderStatus;

  @Field()
  createdAt: Date;

  @Field()
  eventName: string;

  @Field(() => Int)
  quantity: number;

  @Field()
  currency: string;

  @Field(() => Int)
  totalCents: number;
}

@ObjectType()
export class AccountOrderCounts implements AccountOrderCountsModel {
  @Field(() => Int)
  all: number;

  @Field(() => Int)
  pending: number;

  @Field(() => Int)
  cancelled: number;

  @Field(() => Int)
  completed: number;
}

@ObjectType()
export class AccountOrdersPage implements AccountOrdersPageModel {
  @Field(() => [AccountOrderSummary])
  items: AccountOrderSummary[];

  @Field(() => AccountOrderCounts)
  counts: AccountOrderCounts;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}

@ObjectType()
export class AccountOrderEvent implements AccountOrderEventModel {
  @Field()
  name: string;

  @Field()
  coverImage: string;

  @Field()
  venue: string;

  @Field()
  city: string;

  @Field()
  country: string;

  @Field()
  startAt: Date;
}

@ObjectType()
export class AccountOrderItem implements AccountOrderItemModel {
  @Field()
  row: string;

  @Field()
  number: string;
}

@ObjectType()
export class AccountOrderPaymentCard implements AccountOrderPaymentCardModel {
  @Field()
  brand: string;

  @Field()
  last4: string;
}

@ObjectType()
export class AccountOrderDetail implements AccountOrderDetailModel {
  @Field(() => ID)
  id: string;

  @Field(() => AccountOrderStatus)
  status: AccountOrderStatus.COMPLETED | AccountOrderStatus.CANCELLED;

  @Field()
  createdAt: Date;

  @Field(() => AccountOrderEvent)
  event: AccountOrderEvent;

  @Field()
  ticketTypeName: string;

  @Field(() => [AccountOrderItem])
  items: AccountOrderItem[];

  @Field(() => Int)
  quantity: number;

  @Field()
  currency: string;

  @Field(() => Int)
  serviceFeeCents: number;

  @Field(() => Int)
  taxCents: number;

  @Field(() => Int)
  totalCents: number;

  @Field(() => String, { nullable: true })
  paymentId: string | null;

  @Field(() => AccountOrderPaymentCard, { nullable: true })
  paymentCard: AccountOrderPaymentCard | null;
}
