import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BillingApi,
  BillingCardInput,
} from '@sharedModules/integration/interface/billing-integration.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import { CheckoutOrderModel } from '@ticketingModule/core/model/checkout-order.model';
import { toCheckoutOrderModel } from '@ticketingModule/core/service/checkout.service';
import { TicketCodeGenerator } from '@ticketingModule/core/service/ticket-code-generator.service';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { Ticket } from '@ticketingModule/persistence/entity/ticket.entity';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { SeatHoldRepository } from '@ticketingModule/persistence/repository/seat-hold.repository';
import { TicketRepository } from '@ticketingModule/persistence/repository/ticket.repository';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';

const orderNotFound = () =>
  new TicketingException('ORDER_NOT_FOUND', "We couldn't find this order.");

const seatsUnavailable = () =>
  new TicketingException(
    'SEATS_UNAVAILABLE',
    'Some of your seats were just taken. Pick your seats again.',
  );

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
    @InjectDataSource('ticketing')
    private readonly dataSource: DataSource,
    @Inject(BillingApi)
    private readonly billingApi: BillingApi,
    private readonly orderRepository: OrderRepository,
    private readonly seatHoldRepository: SeatHoldRepository,
    private readonly ticketRepository: TicketRepository,
    private readonly ticketCodeGenerator: TicketCodeGenerator,
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

  // Charges the order total, then turns the payment into tickets. A charge
  // that fails leaves the order pending so the buyer can retry (PAY-40).
  private async chargeAndIssue(
    order: Order,
    card: BillingCardInput,
    now: Date,
  ): Promise<CheckoutOrderModel> {
    let charge: Awaited<ReturnType<BillingApi['charge']>>;
    try {
      charge = await this.billingApi.charge({
        userId: order.userId,
        orderId: order.id,
        amountCents: order.totalCents,
        currency: order.currency,
        card,
      });
    } catch {
      await this.orderRepository.releasePayment(order.id);
      throw new Error("We couldn't process your payment.");
    }

    if (charge.status === 'failed') {
      await this.orderRepository.releasePayment(order.id);
      throw new TicketingException(
        'CARD_DECLINED',
        'Your card was declined. Try another card.',
      );
    }

    await this.issue(order, charge.paymentId, now);
    order.status = OrderStatus.PAID;
    order.paidAt = now;
    order.paymentId = charge.paymentId;

    return toCheckoutOrderModel(order, order.items, now);
  }

  // One Ticketing transaction (AD-023, PAY-38): the user's holds must still
  // exist, then they become tickets and the order is paid. Holds are
  // hard-deleted.
  private async issue(
    order: Order,
    paymentId: string,
    now: Date,
  ): Promise<void> {
    const seatIds = order.items.map((item) => item.seatId);

    await this.dataSource.transaction(async (manager) => {
      const holds = await this.seatHoldRepository.lockForSeats(
        manager,
        order.eventId,
        seatIds,
      );
      if (
        holds.length !== seatIds.length ||
        holds.some((hold) => hold.userId !== order.userId)
      ) {
        throw seatsUnavailable();
      }

      await this.ticketRepository.issue(
        manager,
        order.items.map(
          (item) =>
            new Ticket({
              eventId: order.eventId,
              seatId: item.seatId,
              userId: order.userId,
              code: this.ticketCodeGenerator.generate(),
              status: TicketStatus.ISSUED,
              orderItemId: item.id,
            }),
        ),
      );
      await this.seatHoldRepository.deleteForSeats(
        manager,
        order.eventId,
        order.userId,
        seatIds,
      );
      await this.orderRepository.markPaid(manager, order.id, {
        paymentId,
        paidAt: now,
      });
    });
  }
}
