import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A CatalogTicketTypeRowPrice row. The ticket type is referenced by id, so
// insert it first.
interface TicketTypeRowPriceRow {
  id: string;
  ticketTypeId: string;
  row: string;
  premiumCents: number;
}

export const ticketTypeRowPriceFactory =
  Factory.Sync.makeFactory<TicketTypeRowPriceRow>({
    id: Factory.each(() => faker.string.uuid()),
    ticketTypeId: Factory.each(() => faker.string.uuid()),
    row: Factory.each((i) => String(i + 1)),
    premiumCents: Factory.each(() => faker.number.int({ min: 0, max: 20000 })),
  });
