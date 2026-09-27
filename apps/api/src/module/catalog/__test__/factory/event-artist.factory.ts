import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

interface EventArtistRow {
  id: string;
  eventId: string;
  artistId: string;
  headliner: boolean;
  performance_order: number;
}

export const eventArtistFactory = Factory.Sync.makeFactory<EventArtistRow>({
  id: Factory.each(() => faker.string.uuid()),
  eventId: Factory.each(() => faker.string.uuid()),
  artistId: Factory.each(() => faker.string.uuid()),
  headliner: true,
  performance_order: 1,
});
