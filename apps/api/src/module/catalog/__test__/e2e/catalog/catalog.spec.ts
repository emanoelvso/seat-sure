import { artistFactory } from '@catalogModule/__test__/factory/artist.factory';
import { eventArtistFactory } from '@catalogModule/__test__/factory/event-artist.factory';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { CatalogModule } from '@catalogModule/catalog.module';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { createNestApp } from '@testInfra/test-e2e.setup';
import request from 'supertest';
import { DataSource } from 'typeorm';

describe('CatalogResolver (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
  });

  beforeEach(async () => {
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Artist).del();
    await testDbClient(Tables.Event).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Artist).del();
    await testDbClient(Tables.Event).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  describe('Catalog - Mutation createEvent ', () => {
    it('creates a new event', async () => {
      const eventInput = {
        name: 'The Weeknd',
        description: 'After Hours Til Dawn Tour',
        coverImage:
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        venue: 'Allianz Parque',
        city: 'São Paulo',
        country: 'Brazil',
        date: '2026-10-15T03:00:00.000Z',
        startAt: '2026-10-16T00:00:00.000Z',
        endsAt: '2026-10-16T00:00:00.000Z',
        doorsOpen: '2026-10-16T00:00:00.000Z',
        status: 'published',
        price: 299.99,
        category: 'Pop',
        type: 'concert',
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createEvent(EventInput: {
                name: "${eventInput.name}",
                description: "${eventInput.description}",
                coverImage: "${eventInput.coverImage}",
                venue: "${eventInput.venue}",
                city: "${eventInput.city}",
                country: "${eventInput.country}",
                date: "${eventInput.date}",
                startAt: "${eventInput.startAt}",
                endsAt: "${eventInput.endsAt}",
                doorsOpen: "${eventInput.doorsOpen}",
                status: "${eventInput.status}",
                price: ${eventInput.price},
                category: "${eventInput.category}",
                type: "${eventInput.type}",
              }) {
                id
                name
                description
                type
                coverImage
                venue
                city
                country
                date
                startAt
                endsAt
                doorsOpen
                status
                category
                price
              }
            }
          `,
        });

      const {
        id,
        name,
        description,
        type,
        coverImage,
        venue,
        city,
        country,
        date,
        startAt,
        endsAt,
        doorsOpen,
        status,
        category,
        price,
      } = response.body.data.createEvent;

      expect(id).toBeDefined();
      expect(name).toBe(eventInput.name);
      expect(description).toBe(eventInput.description);
      expect(type).toBe(eventInput.type);
      expect(coverImage).toBe(eventInput.coverImage);
      expect(venue).toBe(eventInput.venue);
      expect(city).toBe(eventInput.city);
      expect(country).toBe(eventInput.country);
      expect(date).toBe(eventInput.date);
      expect(startAt).toBe(eventInput.startAt);
      expect(endsAt).toBe(eventInput.endsAt);
      expect(doorsOpen).toBe(eventInput.doorsOpen);
      expect(status).toBe(eventInput.status);
      expect(category).toBe(eventInput.category);
      expect(price).toBe(eventInput.price);
    });

    it('throws error for invalid input', async () => {
      const eventInput = {
        name: 'The Weeknd',
        description: 'After Hours Til Dawn Tour',
        coverImage:
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        venue: 'Allianz Parque',
        city: 'São Paulo',
        country: 'Brazil',
        date: '2026-10-15T03:00:00.000Z',
        startAt: '2026-10-16T00:00:00.000Z',
        endsAt: '2026-10-16T00:00:00.000Z',
        doorsOpen: '2026-10-16T00:00:00.000Z',
        status: 'published',
        category: 'Pop',
        type: 'concert',
      };

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createEvent(EventInput: {
                name: "${eventInput.name}",
                description: "${eventInput.description}",
                coverImage: "${eventInput.coverImage}",
                venue: "${eventInput.venue}",
                city: "${eventInput.city}",
                country: "${eventInput.country}",
                date: "${eventInput.date}",
                startAt: "${eventInput.startAt}",
                endsAt: "${eventInput.endsAt}",
                doorsOpen: "${eventInput.doorsOpen}",
                status: "${eventInput.status}",
                category: "${eventInput.category}",
                type: "${eventInput.type}",
              }) {
                id
                name
                description
                type
                coverImage
                venue
                city
                country
                date
                startAt
                endsAt
                doorsOpen
                status
                category
                price
              }
            }
          `,
        })
        .expect(400);

      expect(response.body.errors[0].message).toContain(
        'Expected value of type "EventInput" to include required field "price',
      );
    });
  });

  describe('Catalog - Query getHomeSections ', () => {
    it('should return home sections', async () => {
      await testDbClient.batchInsert(Tables.Event, [
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.FESTIVAL,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.FESTIVAL,
          status: EventStatus.PUBLISHED,
        }),
      ]);
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
  query GetHomeSections {
    getHomeSections {
      concerts {
        categories
        events {
          id
          name
          description
          coverImage
          venue
          city
          country
          date
          startAt
          status
          price
          category
        }
      }
      shows {
        categories
        events {
          id
          name
          description
          coverImage
          venue
          city
          country
          date
          startAt
          status
          price
          category
        }
      }
      sports {
        categories
        events {
          id
          name
          description
          coverImage
          venue
          city
          country
          date
          startAt
          status
          price
          category
        }
      }
      festivals {
        categories
        events {
          id
          name
          description
          coverImage
          venue
          city
          country
          date
          startAt
          status
          price
          category
        }
      }
    }
  }
          `,
        });

      const { concerts, shows, sports, festivals } =
        response.body.data.getHomeSections;

      expect(concerts.events.length).toBe(2);
      expect(concerts.categories.length).toBeGreaterThanOrEqual(1);

      expect(shows.events.length).toBe(2);
      expect(shows.categories.length).toBeGreaterThanOrEqual(1);

      expect(sports.events.length).toBe(2);
      expect(sports.categories.length).toBeGreaterThanOrEqual(1);

      expect(festivals.events.length).toBe(2);
      expect(festivals.categories.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Catalog - Query findEvents ', () => {
    it('should return filtered events', async () => {
      await testDbClient.batchInsert(Tables.Event, [
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          city: 'São Paulo',
          price: 150,
        }),
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          city: 'São Paulo',
          price: 400,
        }),
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          city: 'Rio de Janeiro',
          price: 250,
        }),
        eventFactory.build({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
          city: 'São Paulo',
          price: 200,
        }),
        eventFactory.build({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
          city: 'Rio de Janeiro',
          price: 500,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindEvents($FindEventsInput: FindEventsInput) {
              findEvents(FindEventsInput: $FindEventsInput) {
                cities
                hasMore
                events {
                  id
                  name
                  type
                  city
                  price
                }
              }
            }
          `,
          variables: {
            FindEventsInput: {
              type: 'CONCERT',
              city: 'São Paulo',
              priceRange: { min: 100, max: 300 },
            },
          },
        });

      const { cities, events, hasMore } = response.body.data.findEvents;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(EventType.CONCERT);
      expect(events[0].city).toBe('São Paulo');
      expect(events[0].price).toBe(150);
      expect(cities).toEqual(['São Paulo']);
      expect(hasMore).toBe(false);
    });

    it('throw error when input is wrong', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              findEvents(FindEventsInput: { type: invalid_type }) {
                hasMore
              }
            }
          `,
        })
        .expect(400);

      expect(response.body.errors[0].message).toContain('EventType');
    });
  });

  describe('Catalog - Query findArtistBySlug ', () => {
    const findArtistBySlug = (slug: string) =>
      request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindArtistBySlug($FindArtistInput: FindArtistInput!) {
              findArtistBySlug(FindArtistInput: $FindArtistInput) {
                artist {
                  name
                }
                eventsByCity {
                  city
                  country
                  events {
                    id
                  }
                }
                nearbyEvents {
                  id
                }
              }
            }
          `,
          variables: { FindArtistInput: { slug } },
        });

    const hoursFromNow = (hours: number) =>
      new Date(Date.now() + hours * 3_600_000);

    const linkEvents = (artistId: string, events: { id?: string }[]) =>
      testDbClient.batchInsert(
        Tables.EventArtist,
        events.map((event) =>
          eventArtistFactory.build({ eventId: event.id, artistId }),
        ),
      );

    const eventIdsByCity = (groups: { events: { id: string }[] }[]) =>
      groups.flatMap((group) => group.events.map((event) => event.id));

    it('returns only upcoming published events of the artist', async () => {
      const artist = artistFactory.build({ slug: 'adele', stage_name: 'Adele' });
      const otherArtist = artistFactory.build({
        slug: 'coldplay',
        stage_name: 'Coldplay',
      });
      const upcoming = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(1),
      });
      const past = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(-1),
      });
      const draft = eventFactory.build({
        status: EventStatus.DRAFT,
        startAt: hoursFromNow(48),
      });
      const otherArtistEvent = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(48),
      });

      await testDbClient.batchInsert(Tables.Artist, [artist, otherArtist]);
      await testDbClient.batchInsert(Tables.Event, [
        upcoming,
        past,
        draft,
        otherArtistEvent,
      ]);
      await linkEvents(artist.id, [upcoming, past, draft]);
      await linkEvents(otherArtist.id, [otherArtistEvent]);

      const response = await findArtistBySlug('adele');

      expect(
        eventIdsByCity(response.body.data.findArtistBySlug.eventsByCity),
      ).toEqual([upcoming.id]);
    });

    it('orders events by startAt within a city and cities by their earliest event', async () => {
      const artist = artistFactory.build({ slug: 'adele', stage_name: 'Adele' });
      const upcomingIn = (city: string, country: string, hours: number) =>
        eventFactory.build({
          status: EventStatus.PUBLISHED,
          city,
          country,
          startAt: hoursFromNow(hours),
        });
      const saoPauloLater = upcomingIn('São Paulo', 'Brazil', 240);
      const rioFirst = upcomingIn('Rio de Janeiro', 'Brazil', 120);
      const saoPauloFirst = upcomingIn('São Paulo', 'Brazil', 48);
      const londonCanada = upcomingIn('London', 'Canada', 72);
      const londonUk = upcomingIn('London', 'United Kingdom', 24);
      const rioLater = upcomingIn('Rio de Janeiro', 'Brazil', 480);
      const events = [
        saoPauloLater,
        rioFirst,
        saoPauloFirst,
        londonCanada,
        londonUk,
        rioLater,
      ];

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, events);
      await linkEvents(artist.id, events);

      const response = await findArtistBySlug('adele');

      expect(
        response.body.data.findArtistBySlug.eventsByCity.map(
          (group: {
            city: string;
            country: string;
            events: { id: string }[];
          }) => [group.city, group.country, group.events.map((e) => e.id)],
        ),
      ).toEqual([
        ['London', 'United Kingdom', [londonUk.id]],
        ['São Paulo', 'Brazil', [saoPauloFirst.id, saoPauloLater.id]],
        ['London', 'Canada', [londonCanada.id]],
        ['Rio de Janeiro', 'Brazil', [rioFirst.id, rioLater.id]],
      ]);
    });

    it('returns at most the 100 earliest upcoming events', async () => {
      const artist = artistFactory.build({ slug: 'adele', stage_name: 'Adele' });
      const events = Array.from({ length: 101 }, (_, index) =>
        eventFactory.build({
          status: EventStatus.PUBLISHED,
          city: 'Las Vegas',
          country: 'USA',
          startAt: hoursFromNow(24 * (index + 1)),
        }),
      );

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, events);
      await linkEvents(artist.id, events);

      const response = await findArtistBySlug('adele');
      const ids = eventIdsByCity(
        response.body.data.findArtistBySlug.eventsByCity,
      );

      expect(ids).toEqual(events.slice(0, 100).map((event) => event.id));
      expect(ids).not.toContain(events[100].id);
    });

    it('should return artist', async () => {
      const artist = artistFactory.build({
        slug: 'the-weeknd',
        stage_name: 'The Weeknd',
        bio: 'Canadian singer known for Blinding Lights.',
      });

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, [
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        eventFactory.build({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindArtistBySlug($FindArtistInput: FindArtistInput!) {
              findArtistBySlug(FindArtistInput: $FindArtistInput) {
                artist {
                  name
                  cover
                  bio
                }
                eventsByCity {
                  city
                  country
                  events {
                    id
                  }
                }
                nearbyEvents {
                  id
                  type
                }
              }
            }
          `,
          variables: {
            FindArtistInput: { slug: 'the-weeknd' },
          },
        });

      const {
        artist: foundArtist,
        eventsByCity,
        nearbyEvents,
      } = response.body.data.findArtistBySlug;

      expect(foundArtist.name).toBe(artist.stage_name);
      expect(foundArtist.bio).toBe(artist.bio);
      expect(foundArtist.cover).toBe(artist.cover_image_url);
      expect(eventsByCity).toEqual([]);
      expect(nearbyEvents).toHaveLength(2);
      expect(
        nearbyEvents.every(
          (e: { type: string }) => e.type === EventType.CONCERT,
        ),
      ).toBe(true);
    });

    it('throw error when input is wrong', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              findArtistBySlug(FindArtistInput: {}) {
                artist {
                  name
                }
              }
            }
          `,
        })
        .expect(400);

      expect(response.body.errors[0].message).toContain(
        'Expected value of type "FindArtistInput" to include required field "slug"',
      );
    });
  });
});
