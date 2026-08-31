import { Movie } from '@contentModule/shared/persistence/entity/movie.entity';
import { faker } from '@faker-js/faker/.';
import * as Factory from 'factory.ts';

export const movieFactory = Factory.Sync.makeFactory<Partial<Movie>>({
  id: faker.string.uuid(),
  contentId: faker.string.uuid(),
  externalRating: faker.number.int({ min: 0, max: 10 }),
  createdAt: faker.date.recent(),
  updatedAt: faker.date.recent(),
  deletedAt: null,
});
