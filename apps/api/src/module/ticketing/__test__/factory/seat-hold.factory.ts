import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A TicketingSeatHold row. Event, seat and user are plain ids (no FK).
interface SeatHoldRow {
  id: string;
  eventId: string;
  seatId: string;
  userId: string;
  expiresAt: Date;
  deletedAt?: Date | null;
}

export const seatHoldFactory = Factory.Sync.makeFactory<SeatHoldRow>({
  id: Factory.each(() => faker.string.uuid()),
  eventId: Factory.each(() => faker.string.uuid()),
  seatId: Factory.each(() => faker.string.uuid()),
  userId: Factory.each(() => faker.string.uuid()),
  expiresAt: Factory.each(() => new Date(Date.now() + 10 * 60_000)),
});
