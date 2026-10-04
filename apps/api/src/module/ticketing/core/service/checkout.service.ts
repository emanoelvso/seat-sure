import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { CatalogApi } from '@sharedModules/integration/interface/catalog-integration.interface';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';
import { TicketingException } from '@ticketingModule/core/exception/ticketing.exception';
import {
  CheckoutOrderModel,
  CheckoutOrderStatus,
} from '@ticketingModule/core/model/checkout-order.model';
import { OrderItem } from '@ticketingModule/persistence/entity/order-item.entity';
import { Order } from '@ticketingModule/persistence/entity/order.entity';
import { OrderRepository } from '@ticketingModule/persistence/repository/order.repository';
import { SeatHoldRepository } from '@ticketingModule/persistence/repository/seat-hold.repository';
import { TicketRepository } from '@ticketingModule/persistence/repository/ticket.repository';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';

const HOLD_DURATION_MS = 10 * 60_000;

const invalidSelection = () =>
  new TicketingException(
    'INVALID_SELECTION',
    "These seats can't be bought for this event.",
  );

const seatsUnavailable = () =>
  new TicketingException(
    'SEATS_UNAVAILABLE',
    'Some of your seats were just taken. Pick your seats again.',
  );

// Maps a stored order to what the buyer sees. `processing` is internal and
// reads as pending, and a pending or processing order past its expiry reads
// as expired (PAY-62). `secondsLeft` uses the API clock (AD-025).
export const toCheckoutOrderModel = (
  order: Order,
  items: OrderItem[],
  now: Date,
): CheckoutOrderModel => {
  const open =
    order.status === OrderStatus.PENDING ||
    order.status === OrderStatus.PROCESSING;
  const status = !open
    ? (order.status.toUpperCase() as CheckoutOrderStatus)
    : order.expiresAt.getTime() < now.getTime()
      ? CheckoutOrderStatus.EXPIRED
      : CheckoutOrderStatus.PENDING;
  const [firstItem] = items;

  return {
    id: order.id,
    status,
    expiresAt: order.expiresAt,
    secondsLeft:
      status === CheckoutOrderStatus.PENDING
        ? Math.max(
            0,
            Math.floor((order.expiresAt.getTime() - now.getTime()) / 1000),
          )
        : 0,
    quantity: items.length,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    serviceFeeCents: order.serviceFeeCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    unitPriceCents: firstItem.unitPriceCents,
    unitServiceFeeCents: firstItem.serviceFeeCents,
    unitTaxCents: firstItem.taxCents,
    event: {
      id: order.eventId,
      name: order.eventName,
      startAt: order.eventStartAt,
      coverImage: order.eventCoverImage,
      venue: order.eventVenue,
      city: order.eventCity,
      country: order.eventCountry,
    },
    ticketType: { id: order.ticketTypeId, name: order.ticketTypeName },
    items: items.map((item) => ({
      seatId: item.seatId,
      row: item.seatRow,
      number: item.seatNumber,
    })),
  };
};

@Injectable()
export class CheckoutService {
  constructor(
    @InjectDataSource('ticketing')
    private readonly dataSource: DataSource,
    @Inject(CatalogApi)
    private readonly catalogApi: CatalogApi,
    private readonly orderRepository: OrderRepository,
    private readonly seatHoldRepository: SeatHoldRepository,
    private readonly ticketRepository: TicketRepository,
  ) {}

  // Holds the seats for 10 minutes and creates a pending order with snapshots
  // of the event, ticket type and prices, all in one transaction (AD-023).
  async start({
    userId,
    eventId,
    ticketTypeId,
    seatIds,
    now,
  }: {
    userId: string;
    eventId: string;
    ticketTypeId: string;
    seatIds: string[];
    now: Date;
  }): Promise<CheckoutOrderModel> {
    if (
      !isUUID(eventId) ||
      !isUUID(ticketTypeId) ||
      seatIds.length === 0 ||
      seatIds.some((seatId) => !isUUID(seatId)) ||
      new Set(seatIds).size !== seatIds.length
    ) {
      throw invalidSelection();
    }

    const selection = await this.catalogApi.findCheckoutSelection({
      eventId,
      ticketTypeId,
      seatIds,
      now,
    });
    if (!selection || seatIds.length > selection.ticketType.maxPerOrder) {
      throw invalidSelection();
    }

    const { event, ticketType, seats } = selection;
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
    const quantity = seats.length;

    const order = new Order({
      userId,
      eventId,
      eventName: event.name,
      eventStartAt: event.startAt,
      eventCoverImage: event.coverImage,
      eventVenue: event.venue,
      eventCity: event.city,
      eventCountry: event.country,
      ticketTypeId,
      ticketTypeName: ticketType.name,
      currency: ticketType.currency,
      status: OrderStatus.PENDING,
      subtotalCents: quantity * ticketType.priceCents,
      serviceFeeCents: quantity * ticketType.serviceFeeCents,
      taxCents: quantity * ticketType.taxCents,
      totalCents:
        quantity *
        (ticketType.priceCents +
          ticketType.serviceFeeCents +
          ticketType.taxCents),
      expiresAt,
      paidAt: null,
      paymentId: null,
    });
    const items = seats.map(
      (seat) =>
        new OrderItem({
          orderId: order.id,
          seatId: seat.id,
          seatRow: seat.row,
          seatNumber: seat.number,
          unitPriceCents: ticketType.priceCents,
          serviceFeeCents: ticketType.serviceFeeCents,
          taxCents: ticketType.taxCents,
        }),
    );

    return this.dataSource.transaction(async (manager) => {
      // Serializes one user's starts for one event, so a double click can't
      // create two orders (PAY-15).
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${userId}:${eventId}`,
      ]);

      // One active checkout per event: the same seats return the unexpired
      // order (PAY-15). Any other pending order is cancelled and its holds
      // are deleted (PAY-14).
      const requested = [...seatIds].sort().join(',');
      for (const pending of await this.orderRepository.findPendingWithItems(
        manager,
        userId,
        eventId,
      )) {
        const pendingSeatIds = pending.items.map((item) => item.seatId);
        if (
          pending.expiresAt.getTime() >= now.getTime() &&
          [...pendingSeatIds].sort().join(',') === requested
        ) {
          return toCheckoutOrderModel(pending, pending.items, now);
        }
        await this.orderRepository.cancel(manager, pending.id);
        await this.seatHoldRepository.deleteForSeats(
          manager,
          eventId,
          userId,
          pendingSeatIds,
        );
      }

      const liveSeatIds = await this.ticketRepository.findLiveSeatIds(
        manager,
        eventId,
        seatIds,
      );
      if (liveSeatIds.length > 0) {
        throw seatsUnavailable();
      }

      // Ascending seat order, so overlapping claims lock rows in the same
      // order and can't deadlock.
      for (const seatId of [...seatIds].sort()) {
        const holdId = await this.seatHoldRepository.claim(manager, {
          eventId,
          seatId,
          userId,
          expiresAt,
          now,
        });
        if (!holdId) {
          throw seatsUnavailable();
        }
      }

      await this.orderRepository.insertWithItems(manager, order, items);

      return toCheckoutOrderModel(order, items, now);
    });
  }
}
