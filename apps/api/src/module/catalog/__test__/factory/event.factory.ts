import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';

export const eventFactory = Factory.Sync.makeFactory<Partial<Event>>({
  id: Factory.each(() => faker.string.uuid()),
  type: Factory.each(() => faker.helpers.enumValue(EventType)),
  name: Factory.each(() => faker.music.artist()),
  description: Factory.each(() => faker.lorem.sentence()),
  coverImage: Factory.each(() => faker.image.url()),
  date: Factory.each(() => faker.date.future()),
  venue: Factory.each(() => faker.company.name()),
  city: Factory.each(() => faker.location.city()),
  country: Factory.each(() => faker.location.country()),
  startAt: Factory.each(() => faker.date.future()),
  endsAt: Factory.each(() => faker.date.future()),
  doorsOpen: Factory.each(() => faker.date.future()),
  status: Factory.each(() => faker.helpers.enumValue(EventStatus)),
  category: Factory.each(() => faker.music.genre()),
  price: Factory.each(() =>
    faker.number.float({ min: 50, max: 1000, fractionDigits: 2 }),
  ),
});
