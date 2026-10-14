import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

// A CatalogSeatMapSectionView row. The seat map is referenced by id, so insert
// it first.
interface SeatMapSectionViewRow {
  id: string;
  seatMapId: string;
  sectionKey: string;
  score: number | string;
  label: string;
}

export const seatMapSectionViewFactory =
  Factory.Sync.makeFactory<SeatMapSectionViewRow>({
    id: Factory.each(() => faker.string.uuid()),
    seatMapId: Factory.each(() => faker.string.uuid()),
    sectionKey: 'vip',
    score: Factory.each(() =>
      faker.number.float({ min: 0, max: 5, fractionDigits: 1 }),
    ),
    label: 'Clear View',
  });
