import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

interface TicketTypeRow {
  id: string;
  eventId: string;
  sectionKey: string;
  name: string;
  priceCents: number;
  currency: string;
  seatsAvailable: number;
  maxPerOrder: number;
  tags: string | null;
}

export const ticketTypeFactory = Factory.Sync.makeFactory<TicketTypeRow>({
  id: Factory.each(() => faker.string.uuid()),
  eventId: Factory.each(() => faker.string.uuid()),
  sectionKey: Factory.each(() => faker.string.alphanumeric(5).toLowerCase()),
  name: Factory.each(() => faker.string.alpha(3).toUpperCase()),
  priceCents: Factory.each(() =>
    faker.number.int({ min: 5000, max: 100000 }),
  ),
  currency: 'USD',
  seatsAvailable: Factory.each(() => faker.number.int({ min: 1, max: 500 })),
  maxPerOrder: 8,
  tags: Factory.each(() => 'discounted,vip'),
});
