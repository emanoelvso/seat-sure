import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BillingApi,
  BillingCardInput,
} from '@sharedModules/integration/interface/billing-integration.interface';
import { IdentityApi } from '@sharedModules/integration/interface/identity-integration.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { TicketSender } from '@ticketingModule/core/adapter/ticket-sender.adapter.interface';
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
import { DataSource, QueryFailedError } from 'typeorm';

const orderNotFound = () =>
  new TicketingException('ORDER_NOT_FOUND', "We couldn't find this order.");

const seatsUnavailable = () =>
  new TicketingException(
    'SEATS_UNAVAILABLE',
    'Some of your seats were just taken. Pick your seats again.',
  );

// Attempts at issuing with fresh ticket codes when a code is already taken
const MAX_ISSUE_ATTEMPTS = 3;

// The unique constraint a query broke, if it broke one
const violatedConstraint = (error: unknown): string | undefined => {
  if (!(error instanceof QueryFailedError)) {
    return undefined;
  }
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return driverError.code === '23505' ? driverError.constraint : undefined;
};

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
    @Inject(IdentityApi)
    private readonly identityApi: IdentityApi,
    @Inject(TicketSender)
    private readonly ticketSender: TicketSender,
    private readonly logger: AppLogger,
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

    let codes: string[];
    try {
      codes = await this.issueWithFreshCodes(order, charge.paymentId, now);
    } catch (error) {
      const seatLost = this.isSeatConflict(error);
      if (!seatLost && !this.isCodeCollision(error)) {
        throw error;
      }
      // Billing has no shared transaction with Ticketing, so the charge is
      // compensated by a refund (AD-022, PAY-46).
      await this.billingApi.refund(charge.paymentId);
      await this.orderRepository.markFailed(order.id);
      if (!seatLost) {
        throw new Error("We couldn't issue your tickets.");
      }
      throw seatsUnavailable();
    }
    await this.sendTickets(order, codes);
    order.status = OrderStatus.PAID;
    order.paidAt = now;
    order.paymentId = charge.paymentId;

    return toCheckoutOrderModel(order, order.items, now);
  }

  // A seat lost between the start and the issuance: a missing or foreign hold,
  // or a live ticket already on the seat (unique violation, AD-014).
  private isSeatConflict(error: unknown): boolean {
    if (
      error instanceof TicketingException &&
      error.reason === 'SEATS_UNAVAILABLE'
    ) {
      return true;
    }
    const constraint = violatedConstraint(error);
    return (
      constraint !== undefined &&
      this.dataSource
        .getMetadata(Ticket)
        .indices.some((index) => index.isUnique && index.name === constraint)
    );
  }

  private isCodeCollision(error: unknown): boolean {
    const constraint = violatedConstraint(error);
    return (
      constraint !== undefined &&
      this.dataSource
        .getMetadata(Ticket)
        .uniques.some((unique) => unique.name === constraint)
    );
  }

  // A taken ticket code rolls the whole issuance back, so it is retried with
  // new codes. The charge is not repeated.
  private async issueWithFreshCodes(
    order: Order,
    paymentId: string,
    now: Date,
  ): Promise<string[]> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.issue(order, paymentId, now);
      } catch (error) {
        if (attempt >= MAX_ISSUE_ATTEMPTS || !this.isCodeCollision(error)) {
          throw error;
        }
      }
    }
  }

  // One Ticketing transaction (AD-023, PAY-38): the user's holds must still
  // exist, then they become tickets and the order is paid. Holds are
  // hard-deleted.
  private async issue(
    order: Order,
    paymentId: string,
    now: Date,
  ): Promise<string[]> {
    const seatIds = order.items.map((item) => item.seatId);

    return this.dataSource.transaction(async (manager) => {
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

      const tickets = order.items.map(
        (item) =>
          new Ticket({
            eventId: order.eventId,
            seatId: item.seatId,
            userId: order.userId,
            code: this.ticketCodeGenerator.generate(),
            status: TicketStatus.ISSUED,
            orderItemId: item.id,
          }),
      );
      await this.ticketRepository.issue(manager, tickets);
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

      return tickets.map((ticket) => ticket.code);
    });
  }

  // Runs after the issuance commit: the order is paid whatever happens here,
  // so a failure is only logged (PAY-39).
  private async sendTickets(order: Order, codes: string[]): Promise<void> {
    try {
      const email = await this.identityApi.findAccountEmail(order.userId);
      if (!email) {
        throw new Error('The buyer has no account email');
      }
      await this.ticketSender.send({
        email,
        eventName: order.eventName,
        codes,
      });
    } catch (exception) {
      this.logger.error("Couldn't send the tickets", {
        exception,
        orderId: order.id,
      });
    }
  }
}
