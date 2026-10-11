import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';

// Event.name and Event.description are varchar(100).
const MAX_TEXT_LENGTH = 100;

// A CatalogEvent row. The venue is referenced by id, so insert the venue first.
type EventRow = Omit<Partial<Event>, 'venue'> & { venueId: string };

export const eventFactory = Factory.Sync.makeFactory<EventRow>({
  id: Factory.each(() => faker.string.uuid()),
  type: Factory.each(() => faker.helpers.enumValue(EventType)),
  name: Factory.each(() => faker.music.artist().slice(0, MAX_TEXT_LENGTH)),
  description: Factory.each(() =>
    faker.lorem.sentence().slice(0, MAX_TEXT_LENGTH),
  ),
  coverImage: Factory.each(() => faker.image.url()),
  date: Factory.each(() => faker.date.future()),
  venueId: Factory.each(() => faker.string.uuid()),
  startAt: Factory.each(() => faker.date.future()),
  endsAt: Factory.each(() => faker.date.future()),
  doorsOpen: Factory.each(() => faker.date.future()),
  status: Factory.each(() => faker.helpers.enumValue(EventStatus)),
  category: Factory.each(() => faker.music.genre()),
  price: Factory.each(() =>
    faker.number.float({ min: 50, max: 1000, fractionDigits: 2 }),
  ),
});
