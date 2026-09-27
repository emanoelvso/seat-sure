import * as Factory from 'factory.ts';
import { faker } from '@faker-js/faker';

interface ArtistRow {
  id: string;
  slug: string;
  stage_name: string;
  bio: string;
  cover_image_url: string;
  genres: string;
}

export const artistFactory = Factory.Sync.makeFactory<ArtistRow>({
  id: Factory.each(() => faker.string.uuid()),
  slug: Factory.each(() =>
    faker.helpers.slugify(faker.music.artist()).toLowerCase(),
  ),
  stage_name: Factory.each(() => faker.music.artist()),
  bio: Factory.each(() => faker.lorem.sentence()),
  cover_image_url: Factory.each(() => faker.image.url()),
  genres: Factory.each(
    () => `${faker.music.genre()},${faker.music.genre()}`,
  ),
});
