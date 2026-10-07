import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { AccountOrdersService } from '@ticketingModule/core/service/account-orders.service';
import { CheckoutService } from '@ticketingModule/core/service/checkout.service';
import {
  OrderPaymentService,
  toChargeSource,
} from '@ticketingModule/core/service/order-payment.service';
import { TicketingService } from '@ticketingModule/core/service/ticketing.service';
import { ClsService } from 'nestjs-cls';
import {
  AccountOrderDetail,
  AccountOrdersPage,
} from './type/account-orders.type';
import { CheckoutOrder } from './type/checkout-order.type';
import { FindAccountOrderInput } from './type/find-account-order-input.type';
import { FindAccountOrdersInput } from './type/find-account-orders-input.type';
import { FindCheckoutOrderInput } from './type/find-checkout-order-input.type';
import { FindUnavailableSeatsInput } from './type/find-unavailable-seats-input.type';
import { PayOrderInput } from './type/pay-order-input.type';
import { StartCheckoutInput } from './type/start-checkout-input.type';
import { UnavailableSeats } from './type/unavailable-seats.type';

@Resolver()
export class TicketingResolver {
  constructor(
    private readonly ticketingService: TicketingService,
    private readonly checkoutService: CheckoutService,
    private readonly orderPaymentService: OrderPaymentService,
    private readonly accountOrdersService: AccountOrdersService,
    private readonly clsService: ClsService,
  ) {}

  @Query(() => UnavailableSeats)
  async findUnavailableSeats(
    @Args('FindUnavailableSeatsInput') { eventId }: FindUnavailableSeatsInput,
  ): Promise<UnavailableSeats> {
    return this.ticketingService.findUnavailableSeats({ eventId });
  }

  @UseGuards(AuthGuard)
  @Mutation(() => CheckoutOrder)
  async startCheckout(
    @Args('input') { eventId, ticketTypeId, seatIds }: StartCheckoutInput,
  ): Promise<CheckoutOrder> {
    return this.checkoutService.start({
      userId: this.clsService.get<string>('userId'),
      eventId,
      ticketTypeId,
      seatIds,
      now: new Date(),
    });
  }

  @UseGuards(AuthGuard)
  @Query(() => CheckoutOrder, { nullable: true })
  async findCheckoutOrder(
    @Args('input') { orderId }: FindCheckoutOrderInput,
  ): Promise<CheckoutOrder | null> {
    return this.checkoutService.findForUser({
      userId: this.clsService.get<string>('userId'),
      orderId,
      now: new Date(),
    });
  }

  @UseGuards(AuthGuard)
  @Mutation(() => CheckoutOrder)
  async payOrder(
    @Args('input') { orderId, card, savedCardId }: PayOrderInput,
  ): Promise<CheckoutOrder> {
    return this.orderPaymentService.pay({
      userId: this.clsService.get<string>('userId'),
      orderId,
      source: toChargeSource(card, savedCardId),
      now: new Date(),
    });
  }

  @UseGuards(AuthGuard)
  @Query(() => AccountOrdersPage)
  async findAccountOrders(
    @Args('input') { tab, sort, page, pageSize }: FindAccountOrdersInput,
  ): Promise<AccountOrdersPage> {
    return this.accountOrdersService.list({
      userId: this.clsService.get<string>('userId'),
      tab,
      sort,
      page,
      pageSize,
      now: new Date(),
    });
  }

  @UseGuards(AuthGuard)
  @Query(() => AccountOrderDetail, { nullable: true })
  async findAccountOrder(
    @Args('input') { orderId }: FindAccountOrderInput,
  ): Promise<AccountOrderDetail | null> {
    return this.accountOrdersService.findOne({
      userId: this.clsService.get<string>('userId'),
      orderId,
    });
  }
}
