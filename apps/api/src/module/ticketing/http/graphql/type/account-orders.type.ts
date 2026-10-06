import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  AccountOrderCountsModel,
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
