import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A CatalogSeat row. The seat map is referenced by id, so insert it first.
interface SeatRow {
  id: string;
  seatMapId: string;
  sectionKey: string;
  row: string;
  number: string;
  x: number;
  y: number;
  deletedAt?: Date | null;
}

export const seatFactory = Factory.Sync.makeFactory<SeatRow>({
  id: Factory.each(() => faker.string.uuid()),
  seatMapId: Factory.each(() => faker.string.uuid()),
  sectionKey: 'vip',
  row: Factory.each((i) => String(i + 1)),
  number: Factory.each((i) => String(i + 1).padStart(2, '0')),
  x: Factory.each(() => faker.number.float({ min: 0, max: 800 })),
  y: Factory.each(() => faker.number.float({ min: 0, max: 600 })),
});
