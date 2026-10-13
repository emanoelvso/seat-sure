import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';

// A CatalogSeatMap row. The venue is referenced by id, so insert the venue
// first; an event using the map must be at the same venue.
interface SeatMapRow {
  id: string;
  name: string;
  venueId: string;
  layout: string;
}

const defaultLayout: SeatMapLayout = {
  viewBox: { width: 704, height: 704 },
  labelStyle: { size: 24, weight: 700 },
  stage: {
    label: 'STAGE',
    labelAt: [352, 50],
    shapes: [{ path: 'M100 0L604 0L604 100L100 100Z', color: '#999999' }],
  },
  sections: [
    {
      key: 'vip',
      label: 'VIP',
      color: '#454545',
      shapes: [
        {
          path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
          labelAt: [352, 300],
          labelRotation: 0,
        },
      ],
    },
    {
      key: 'a',
      label: 'A',
      color: '#303030',
      shapes: [
        {
          path: 'M152 300A200 200 0 1 0 552 300A200 200 0 1 0 152 300Z',
          labelAt: [352, 500],
          labelRotation: 0,
        },
      ],
    },
  ],
};

export const seatMapFactory = Factory.Sync.makeFactory<SeatMapRow>({
  id: Factory.each(() => faker.string.uuid()),
  name: Factory.each(() => faker.company.name()),
  venueId: Factory.each(() => faker.string.uuid()),
  layout: Factory.each(() => JSON.stringify(defaultLayout)),
});
