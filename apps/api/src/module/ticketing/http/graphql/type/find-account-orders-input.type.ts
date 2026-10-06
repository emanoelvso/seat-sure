import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  AccountOrdersSort,
  AccountOrdersTab,
} from '@ticketingModule/core/model/account-order.model';
import { IsEnum, IsInt } from 'class-validator';

registerEnumType(AccountOrdersTab, { name: 'AccountOrdersTab' });
registerEnumType(AccountOrdersSort, { name: 'AccountOrdersSort' });

@InputType()
export class FindAccountOrdersInput {
  @IsEnum(AccountOrdersTab)
  @Field(() => AccountOrdersTab, { defaultValue: AccountOrdersTab.ALL })
  tab: AccountOrdersTab;

  @IsEnum(AccountOrdersSort)
  @Field(() => AccountOrdersSort, { defaultValue: AccountOrdersSort.NEWEST })
  sort: AccountOrdersSort;

  // SPEC_DEVIATION: the design bounds page and pageSize with @Min/@Max here.
  // Reason: a ValidationPipe error is a 400 (BAD_REQUEST), and main.ts has no
  // global ValidationPipe, so AccountOrdersService checks the bounds and
  // throws INVALID_PAGE (422, BAD_USER_INPUT, AD-018) instead.
  @IsInt()
  @Field(() => Int)
  page: number;

  @IsInt()
  @Field(() => Int)
  pageSize: number;
}
