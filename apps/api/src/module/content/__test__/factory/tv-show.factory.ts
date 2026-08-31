import { TvShow } from '@contentModule/shared/persistence/entity/tv-show.entity';
import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker/.';

export const tvShowFactory = Factory.Sync.makeFactory<Partial<TvShow>>({
  id: faker.string.uuid(),
  contentId: faker.string.uuid(),
  createdAt: faker.date.recent(),
  updatedAt: faker.date.recent(),
  deletedAt: null,
});
