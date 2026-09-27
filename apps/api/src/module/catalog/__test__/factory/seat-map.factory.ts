import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';

interface SeatMapRow {
  id: string;
  name: string;
  venueId: string | null;
  layout: string;
}

const defaultLayout: SeatMapLayout = {
  viewBox: { width: 704, height: 704 },
  stage: {
    label: 'STAGE',
    path: 'M100 0L604 0L604 100L100 100Z',
    labelAt: [352, 50],
  },
  sections: [
    {
      key: 'vip',
      label: 'VIP',
      path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
      color: '#454545',
      labelAt: [352, 300],
    },
    {
      key: 'a',
      label: 'A',
      path: 'M152 300A200 200 0 1 0 552 300A200 200 0 1 0 152 300Z',
      color: '#303030',
      labelAt: [352, 500],
    },
  ],
};

export const seatMapFactory = Factory.Sync.makeFactory<SeatMapRow>({
  id: Factory.each(() => faker.string.uuid()),
  name: Factory.each(() => faker.company.name()),
  venueId: null,
  layout: Factory.each(() => JSON.stringify(defaultLayout)),
});
