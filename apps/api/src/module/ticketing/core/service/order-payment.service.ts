import { Inject, Injectable } from '@nestjs/common';
import {
  BillingApi,
  BillingCardInput,
} from '@sharedModules/integration/interface/billing-integration.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import { CheckoutOrderModel } from '@ticketingModule/core/model/checkout-order.model';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { isUUID } from 'class-validator';

const orderNotFound = () =>
  new TicketingException('ORDER_NOT_FOUND', "We couldn't find this order.");

const paymentInProgress = () =>
  new TicketingException(
    'PAYMENT_IN_PROGRESS',
    'A payment for this order is already in progress.',
  );

// Throws the reason an order can't be paid now, if any (PAY-41..PAY-43).
// Cancelled and failed orders read as not found.
function assertPayable(order: Order | null, now: Date): asserts order is Order {
  if (
    !order ||
    order.status === OrderStatus.CANCELLED ||
    order.status === OrderStatus.FAILED
  ) {
    throw orderNotFound();
  }
  if (order.status === OrderStatus.PAID) {
    throw new TicketingException(
      'ORDER_ALREADY_PAID',
      'This order is already paid.',
    );
  }
  if (order.expiresAt.getTime() < now.getTime()) {
    throw new TicketingException(
      'ORDER_EXPIRED',
      'Your time to pay for this order ran out.',
    );
  }
  if (order.status === OrderStatus.PROCESSING) {
    throw paymentInProgress();
  }
}

@Injectable()
export class OrderPaymentService {
  constructor(
    @Inject(BillingApi)
    private readonly billingApi: BillingApi,
    private readonly orderRepository: OrderRepository,
  ) {}

  async pay({
    userId,
    orderId,
    card,
    now,
  }: {
    userId: string;
    orderId: string;
    card: BillingCardInput;
    now: Date;
  }): Promise<CheckoutOrderModel> {
    if (!isUUID(orderId)) {
      throw orderNotFound();
    }

    const findOrder = () =>
      this.orderRepository.findOne({
        where: { id: orderId, userId },
        relations: { items: true },
      });

    const order = await findOrder();
    assertPayable(order, now);

    // Only the invalid fields, so the client marks exactly those (PAY-44)
    const fields = Object.fromEntries(
      Object.entries(await this.billingApi.validateCard(card, now)).filter(
        ([, message]) => message !== '',
      ),
    );
    if (Object.keys(fields).length > 0) {
      throw new TicketingException(
        'INVALID_CARD',
        'Check your card details.',
        fields,
      );
    }

    // A concurrent call may have claimed, paid or let the order expire in
    // between: the fresh row says which (PAY-45). One that is pending again
    // was claimed and released by another attempt.
    if (!(await this.orderRepository.claimPayment(orderId, now))) {
      assertPayable(await findOrder(), now);
      throw paymentInProgress();
    }

    return this.chargeAndIssue(order, card, now);
  }

  // Replaced by the charge and issuance steps
  private async chargeAndIssue(
    ...args: [Order, BillingCardInput, Date]
  ): Promise<CheckoutOrderModel> {
    void args;
    throw new Error('Charging an order is not implemented yet');
  }
}
