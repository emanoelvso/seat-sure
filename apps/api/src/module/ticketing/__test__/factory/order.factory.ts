import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { OrderStatus } from '@ticketingModule/core/enum/order-status.enum';

// A TicketingOrder row. User, event, ticket type and payment are plain ids
// (no FK).
interface OrderRow {
  id: string;
  userId: string;
  eventId: string;
  eventName: string;
  eventStartAt: Date;
  eventCoverImage: string;
  eventVenue: string;
  eventCity: string;
  eventCountry: string;
  ticketTypeId: string;
  ticketTypeName: string;
  currency: string;
  status: OrderStatus;
  subtotalCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt: Date;
  paidAt?: Date | null;
  paymentId?: string | null;
}

// A TicketingOrderItem row
interface OrderItemRow {
  id: string;
  orderId: string;
  seatId: string;
  seatRow: string;
  seatNumber: string;
  unitPriceCents: number;
  serviceFeeCents: number;
  taxCents: number;
}

export const orderFactory = Factory.Sync.makeFactory<OrderRow>({
  id: Factory.each(() => faker.string.uuid()),
  userId: Factory.each(() => faker.string.uuid()),
  eventId: Factory.each(() => faker.string.uuid()),
  eventName: Factory.each(() => faker.music.songName().slice(0, 100)),
  eventStartAt: Factory.each(() => faker.date.future()),
  eventCoverImage: Factory.each(() => faker.image.url()),
  eventVenue: Factory.each(() => faker.company.name().slice(0, 100)),
  eventCity: Factory.each(() => faker.location.city().slice(0, 100)),
  eventCountry: Factory.each(() => faker.location.countryCode()),
  ticketTypeId: Factory.each(() => faker.string.uuid()),
  ticketTypeName: Factory.each(() => faker.string.alpha(3).toUpperCase()),
  currency: 'USD',
  status: OrderStatus.PENDING,
  subtotalCents: 90000,
  serviceFeeCents: 13500,
  taxCents: 7200,
  totalCents: 110700,
  expiresAt: Factory.each(() => new Date(Date.now() + 10 * 60_000)),
});

export const orderItemFactory = Factory.Sync.makeFactory<OrderItemRow>({
  id: Factory.each(() => faker.string.uuid()),
  orderId: Factory.each(() => faker.string.uuid()),
  seatId: Factory.each(() => faker.string.uuid()),
  seatRow: Factory.each(() => String(faker.number.int({ min: 1, max: 30 }))),
  seatNumber: Factory.each(() => String(faker.number.int({ min: 1, max: 40 }))),
  unitPriceCents: 45000,
  serviceFeeCents: 6750,
  taxCents: 3600,
});
