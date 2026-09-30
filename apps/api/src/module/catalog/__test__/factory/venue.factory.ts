import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

interface VenueRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  capacity: number;
}

export const venueFactory = Factory.Sync.makeFactory<VenueRow>({
  id: Factory.each(() => faker.string.uuid()),
  name: Factory.each(() => faker.company.name()),
  address: Factory.each(() => faker.location.streetAddress()),
  city: Factory.each(() => faker.location.city()),
  state: Factory.each(() => faker.location.state({ abbreviated: true })),
  // CatalogVenue.country is varchar(15), too short for some faker countries.
  country: Factory.each(() =>
    faker.helpers.arrayElement(['Brazil', 'USA', 'United Kingdom', 'Canada']),
  ),
  latitude: Factory.each(() => faker.location.latitude()),
  longitude: Factory.each(() => faker.location.longitude()),
  capacity: Factory.each(() => faker.number.int({ min: 500, max: 80000 })),
});
