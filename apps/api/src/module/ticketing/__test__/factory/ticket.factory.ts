import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';

// A TicketingTicket row. Event, seat and user are plain ids (no FK).
interface TicketRow {
  id: string;
  eventId: string;
  seatId: string | null;
  userId: string;
  code: string;
  status: TicketStatus;
  deletedAt?: Date | null;
}

export const ticketFactory = Factory.Sync.makeFactory<TicketRow>({
  id: Factory.each(() => faker.string.uuid()),
  eventId: Factory.each(() => faker.string.uuid()),
  seatId: Factory.each(() => faker.string.uuid()),
  userId: Factory.each(() => faker.string.uuid()),
  code: Factory.each(() => faker.string.alphanumeric(12).toUpperCase()),
  status: TicketStatus.ISSUED,
});
