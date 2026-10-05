import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { CheckoutService } from '@ticketingModule/core/service/checkout.service';
import { OrderPaymentService } from '@ticketingModule/core/service/order-payment.service';
import { TicketingService } from '@ticketingModule/core/service/ticketing.service';
import { ClsService } from 'nestjs-cls';
import { CheckoutOrder } from './type/checkout-order.type';
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
    @Args('input') { orderId, card }: PayOrderInput,
  ): Promise<CheckoutOrder> {
    return this.orderPaymentService.pay({
      userId: this.clsService.get<string>('userId'),
      orderId,
      card,
      now: new Date(),
    });
  }
}
