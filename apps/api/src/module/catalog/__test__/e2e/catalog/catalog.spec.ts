import { artistFactory } from '@catalogModule/__test__/factory/artist.factory';
import { eventArtistFactory } from '@catalogModule/__test__/factory/event-artist.factory';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
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

  // Allianz Parque and The O2 Arena differ in name, city and country, so a
  // response can only match one of them. Tokio Marine Hall shares Allianz
  // Parque's city, and Budweiser Gardens shares The O2 Arena's city in
  // another country.
  const allianzParque = venueFactory.build({
    name: 'Allianz Parque',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
  });
  const tokioMarineHall = venueFactory.build({
    name: 'Tokio Marine Hall',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
  });
  const jeunesseArena = venueFactory.build({
    name: 'Jeunesse Arena',
    city: 'Rio de Janeiro',
    state: 'RJ',
    country: 'Brazil',
  });
  const theO2Arena = venueFactory.build({
    name: 'The O2 Arena',
    city: 'London',
    state: 'England',
    country: 'United Kingdom',
  });
  const budweiserGardens = venueFactory.build({
    name: 'Budweiser Gardens',
    city: 'London',
    state: 'ON',
    country: 'Canada',
  });
  const theColosseum = venueFactory.build({
    name: 'The Colosseum at Caesars Palace',
    city: 'Las Vegas',
    state: 'NV',
    country: 'USA',
  });
  const venues = [
    allianzParque,
    tokioMarineHall,
    jeunesseArena,
    theO2Arena,
    budweiserGardens,
    theColosseum,
  ];

  const buildEvent = (
    overrides: Parameters<typeof eventFactory.build>[0] = {},
  ) => eventFactory.build({ venueId: allianzParque.id, ...overrides });

  const byId = <T extends { id: string }>(events: T[]) =>
    Object.fromEntries(events.map((event) => [event.id, event]));

  const venueFields = (venue: (typeof venues)[number]) => ({
    venue: venue.name,
    city: venue.city,
    country: venue.country,
  });

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    await testDbClient.batchInsert(Tables.Venue, venues);
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
    await testDbClient(Tables.Venue)
      .whereIn(
        'id',
        venues.map((venue) => venue.id),
      )
      .del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  describe('Catalog - Mutation createEvent ', () => {
    it('creates a new event at the venue of the given venueId (ALIGN-13)', async () => {
      const eventInput = {
        name: 'The Weeknd',
        description: 'After Hours Til Dawn Tour',
        coverImage:
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        venueId: allianzParque.id,
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
                venueId: "${eventInput.venueId}",
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
      expect(venue).toBe(allianzParque.name);
      expect(city).toBe(allianzParque.city);
      expect(country).toBe(allianzParque.country);
      expect(date).toBe(eventInput.date);
      expect(startAt).toBe(eventInput.startAt);
      expect(endsAt).toBe(eventInput.endsAt);
      expect(doorsOpen).toBe(eventInput.doorsOpen);
      expect(status).toBe(eventInput.status);
      expect(category).toBe(eventInput.category);
      expect(price).toBe(eventInput.price);

      const stored = await testDbClient(Tables.Event).where({ id }).first();
      expect(stored.venueId).toBe(allianzParque.id);
    });

    it('throws error for invalid input', async () => {
      const eventInput = {
        name: 'The Weeknd',
        description: 'After Hours Til Dawn Tour',
        coverImage:
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
        venueId: allianzParque.id,
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
                venueId: "${eventInput.venueId}",
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

    const createEventAt = (venueId: string) =>
      request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation CreateEvent($EventInput: EventInput!) {
              createEvent(EventInput: $EventInput) {
                id
              }
            }
          `,
          variables: {
            EventInput: {
              name: 'Kendrick Lamar',
              description: 'GNX Tour',
              coverImage:
                'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800',
              venueId,
              date: '2026-12-12T03:00:00.000Z',
              startAt: '2026-12-13T00:00:00.000Z',
              endsAt: '2026-12-13T02:30:00.000Z',
              doorsOpen: '2026-12-12T22:30:00.000Z',
              status: 'published',
              price: 239.99,
              category: 'Hip-Hop',
              type: 'concert',
            },
          },
        });

    it('returns Venue not found and stores no event for an unknown venueId (ALIGN-14)', async () => {
      const response = await createEventAt(
        'b1000000-0000-4000-8000-000000000001',
      );

      expect(response.body.errors[0].message).toBe('Venue not found');
      expect(await testDbClient(Tables.Event).select('id')).toEqual([]);
    });

    it('returns a validation error and stores no event for a venueId that is not a UUID (ALIGN-15)', async () => {
      const response = await createEventAt('not-a-uuid');

      expect(
        response.body.errors[0].extensions.originalError.message,
      ).toContain('venueId must be a UUID');
      expect(await testDbClient(Tables.Event).select('id')).toEqual([]);
    });
  });

  describe('Catalog - Query getHomeSections ', () => {
    it('should return home sections', async () => {
      await testDbClient.batchInsert(Tables.Event, [
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
          type: EventType.FESTIVAL,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
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

    it('returns each event with the name, city and country of its own venue (ALIGN-10)', async () => {
      const atAllianzParque = buildEvent({
        type: EventType.CONCERT,
        status: EventStatus.PUBLISHED,
      });
      const atTheO2Arena = buildEvent({
        type: EventType.CONCERT,
        status: EventStatus.PUBLISHED,
        venueId: theO2Arena.id,
      });
      await testDbClient.batchInsert(Tables.Event, [
        atAllianzParque,
        atTheO2Arena,
      ]);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              getHomeSections {
                concerts {
                  events {
                    id
                    venue
                    city
                    country
                  }
                }
              }
            }
          `,
        });

      expect(response.body.errors).toBeUndefined();
      expect(byId(response.body.data.getHomeSections.concerts.events)).toEqual({
        [atAllianzParque.id!]: {
          id: atAllianzParque.id,
          ...venueFields(allianzParque),
        },
        [atTheO2Arena.id!]: {
          id: atTheO2Arena.id,
          ...venueFields(theO2Arena),
        },
      });
    });
  });

  describe('Catalog - Query findEvents ', () => {
    it('should return filtered events', async () => {
      await testDbClient.batchInsert(Tables.Event, [
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          venueId: allianzParque.id,
          price: 150,
        }),
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          venueId: allianzParque.id,
          price: 400,
        }),
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          venueId: jeunesseArena.id,
          price: 250,
        }),
        buildEvent({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
          venueId: allianzParque.id,
          price: 200,
        }),
        buildEvent({
          type: EventType.SPORT,
          status: EventStatus.PUBLISHED,
          venueId: jeunesseArena.id,
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
              city: allianzParque.city,
              priceRange: { min: 100, max: 300 },
            },
          },
        });

      const { cities, events, hasMore } = response.body.data.findEvents;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(EventType.CONCERT);
      expect(events[0].city).toBe(allianzParque.city);
      expect(events[0].price).toBe(150);
      expect(cities).toEqual([allianzParque.city]);
      expect(hasMore).toBe(false);
    });

    const findEvents = (FindEventsInput?: object) =>
      request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindEvents($FindEventsInput: FindEventsInput) {
              findEvents(FindEventsInput: $FindEventsInput) {
                cities
                hasMore
                events {
                  id
                  venue
                  city
                  country
                }
              }
            }
          `,
          variables: { FindEventsInput },
        });

    it('returns each event with the name, city and country of its own venue (ALIGN-10)', async () => {
      const atAllianzParque = buildEvent({ status: EventStatus.PUBLISHED });
      const atTheO2Arena = buildEvent({
        status: EventStatus.PUBLISHED,
        venueId: theO2Arena.id,
      });
      await testDbClient.batchInsert(Tables.Event, [
        atAllianzParque,
        atTheO2Arena,
      ]);

      const response = await findEvents();

      expect(response.body.errors).toBeUndefined();
      expect(byId(response.body.data.findEvents.events)).toEqual({
        [atAllianzParque.id!]: {
          id: atAllianzParque.id,
          ...venueFields(allianzParque),
        },
        [atTheO2Arena.id!]: {
          id: atTheO2Arena.id,
          ...venueFields(theO2Arena),
        },
      });
    });

    it('filters on the city of the event venue (ALIGN-11)', async () => {
      const atAllianzParque = buildEvent({ status: EventStatus.PUBLISHED });
      const atTokioMarineHall = buildEvent({
        status: EventStatus.PUBLISHED,
        venueId: tokioMarineHall.id,
      });
      await testDbClient.batchInsert(Tables.Event, [
        atAllianzParque,
        atTokioMarineHall,
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: jeunesseArena.id,
        }),
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: theO2Arena.id,
        }),
      ]);

      const response = await findEvents({ city: allianzParque.city });

      expect(response.body.errors).toBeUndefined();
      const { cities, events } = response.body.data.findEvents;
      expect(byId(events)).toEqual({
        [atAllianzParque.id!]: {
          id: atAllianzParque.id,
          ...venueFields(allianzParque),
        },
        [atTokioMarineHall.id!]: {
          id: atTokioMarineHall.id,
          ...venueFields(tokioMarineHall),
        },
      });
      expect(cities).toEqual([allianzParque.city]);
    });

    it('lists the sorted venue cities of the page plus the extra row read for hasMore (ALIGN-11)', async () => {
      await testDbClient.batchInsert(Tables.Event, [
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: jeunesseArena.id,
        }),
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: theO2Arena.id,
        }),
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: allianzParque.id,
        }),
      ]);

      const response = await findEvents({ limit: 2 });

      expect(response.body.errors).toBeUndefined();
      const { cities, events, hasMore } = response.body.data.findEvents;
      expect(events).toHaveLength(2);
      expect(hasMore).toBe(true);
      expect(cities).toEqual([
        theO2Arena.city,
        jeunesseArena.city,
        allianzParque.city,
      ]);
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
                featuredFestival {
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
      const artist = artistFactory.build({
        slug: 'adele',
        stage_name: 'Adele',
      });
      const otherArtist = artistFactory.build({
        slug: 'coldplay',
        stage_name: 'Coldplay',
      });
      const upcoming = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(1),
      });
      const past = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(-1),
      });
      const draft = buildEvent({
        status: EventStatus.DRAFT,
        startAt: hoursFromNow(48),
      });
      const otherArtistEvent = buildEvent({
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
      const artist = artistFactory.build({
        slug: 'adele',
        stage_name: 'Adele',
      });
      const upcomingAt = (venueId: string, hours: number) =>
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId,
          startAt: hoursFromNow(hours),
        });
      const saoPauloLater = upcomingAt(allianzParque.id, 240);
      const rioFirst = upcomingAt(jeunesseArena.id, 120);
      const saoPauloFirst = upcomingAt(allianzParque.id, 48);
      const londonCanada = upcomingAt(budweiserGardens.id, 72);
      const londonUk = upcomingAt(theO2Arena.id, 24);
      const rioLater = upcomingAt(jeunesseArena.id, 480);
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
        [theO2Arena.city, theO2Arena.country, [londonUk.id]],
        [
          allianzParque.city,
          allianzParque.country,
          [saoPauloFirst.id, saoPauloLater.id],
        ],
        [budweiserGardens.city, budweiserGardens.country, [londonCanada.id]],
        [jeunesseArena.city, jeunesseArena.country, [rioFirst.id, rioLater.id]],
      ]);
    });

    it('groups events at different venues of the same city and country (ALIGN-12)', async () => {
      const artist = artistFactory.build({
        slug: 'adele',
        stage_name: 'Adele',
      });
      const atAllianzParque = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      const atJeunesseArena = buildEvent({
        status: EventStatus.PUBLISHED,
        venueId: jeunesseArena.id,
        startAt: hoursFromNow(48),
      });
      const atTokioMarineHall = buildEvent({
        status: EventStatus.PUBLISHED,
        venueId: tokioMarineHall.id,
        startAt: hoursFromNow(72),
      });
      const events = [atAllianzParque, atJeunesseArena, atTokioMarineHall];

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, events);
      await linkEvents(artist.id, events);

      const response = await findArtistBySlug('adele');

      expect(response.body.data.findArtistBySlug.eventsByCity).toEqual([
        {
          city: allianzParque.city,
          country: allianzParque.country,
          events: [{ id: atAllianzParque.id }, { id: atTokioMarineHall.id }],
        },
        {
          city: jeunesseArena.city,
          country: jeunesseArena.country,
          events: [{ id: atJeunesseArena.id }],
        },
      ]);
    });

    it('returns each event with the name, city and country of its own venue (ALIGN-10)', async () => {
      const artist = artistFactory.build({
        slug: 'adele',
        stage_name: 'Adele',
        genres: 'soul',
      });
      const concert = (venueId: string, hours: number) =>
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          category: 'Rock',
          venueId,
          startAt: hoursFromNow(hours),
        });
      const ownAtAllianzParque = concert(allianzParque.id, 24);
      const ownAtTheO2Arena = concert(theO2Arena.id, 48);
      const nearbyAtTheO2Arena = concert(theO2Arena.id, 12);
      const nearbyAtAllianzParque = concert(allianzParque.id, 36);
      const festivalAtTheO2Arena = buildEvent({
        type: EventType.FESTIVAL,
        status: EventStatus.PUBLISHED,
        venueId: theO2Arena.id,
        startAt: hoursFromNow(72),
      });

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, [
        ownAtAllianzParque,
        ownAtTheO2Arena,
        nearbyAtTheO2Arena,
        nearbyAtAllianzParque,
        festivalAtTheO2Arena,
      ]);
      await linkEvents(artist.id, [ownAtAllianzParque, ownAtTheO2Arena]);

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindArtistBySlug($FindArtistInput: FindArtistInput!) {
              findArtistBySlug(FindArtistInput: $FindArtistInput) {
                eventsByCity {
                  events {
                    id
                    venue
                    city
                    country
                  }
                }
                nearbyEvents {
                  id
                  venue
                  city
                  country
                }
                featuredFestival {
                  id
                  venue
                  city
                  country
                }
              }
            }
          `,
          variables: { FindArtistInput: { slug: 'adele' } },
        });

      expect(response.body.errors).toBeUndefined();
      const { eventsByCity, nearbyEvents, featuredFestival } =
        response.body.data.findArtistBySlug;
      expect(eventsByCity).toEqual([
        {
          events: [
            { id: ownAtAllianzParque.id, ...venueFields(allianzParque) },
          ],
        },
        { events: [{ id: ownAtTheO2Arena.id, ...venueFields(theO2Arena) }] },
      ]);
      expect(nearbyEvents).toEqual([
        { id: nearbyAtTheO2Arena.id, ...venueFields(theO2Arena) },
        { id: nearbyAtAllianzParque.id, ...venueFields(allianzParque) },
      ]);
      expect(featuredFestival).toEqual({
        id: festivalAtTheO2Arena.id,
        ...venueFields(theO2Arena),
      });
    });

    it('returns at most the 100 earliest upcoming events', async () => {
      const artist = artistFactory.build({
        slug: 'adele',
        stage_name: 'Adele',
      });
      const events = Array.from({ length: 101 }, (_, index) =>
        buildEvent({
          status: EventStatus.PUBLISHED,
          venueId: theColosseum.id,
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

    describe('nearbyEvents', () => {
      const upcomingConcert = (category: string, hours: number) =>
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          category,
          startAt: hoursFromNow(hours),
        });

      const nearbyIds = async (slug: string) => {
        const response = await findArtistBySlug(slug);
        return response.body.data.findArtistBySlug.nearbyEvents.map(
          (event: { id: string }) => event.id,
        );
      };

      it('returns at most 4 upcoming published concerts not linked to the artist', async () => {
        const artist = artistFactory.build({
          slug: 'adele',
          stage_name: 'Adele',
          genres: 'pop,soul',
        });
        const ownConcert = upcomingConcert('Pop', 1);
        const pastConcert = upcomingConcert('Pop', -1);
        const draftConcert = buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.DRAFT,
          category: 'Pop',
          startAt: hoursFromNow(1),
        });
        const upcomingShow = buildEvent({
          type: EventType.SHOW,
          status: EventStatus.PUBLISHED,
          category: 'Pop',
          startAt: hoursFromNow(1),
        });
        const qualifying = [2, 3, 4, 5, 6].map((hours) =>
          upcomingConcert('Rock', hours),
        );

        await testDbClient.batchInsert(Tables.Artist, [artist]);
        await testDbClient.batchInsert(Tables.Event, [
          ownConcert,
          pastConcert,
          draftConcert,
          upcomingShow,
          ...qualifying,
        ]);
        await linkEvents(artist.id, [ownConcert]);

        const ids = await nearbyIds('adele');

        expect(ids).toEqual(qualifying.slice(0, 4).map((event) => event.id));
      });

      it('ranks concerts matching an artist genre case-insensitively first, each group by startAt', async () => {
        const artist = artistFactory.build({
          slug: 'adele',
          stage_name: 'Adele',
          genres: 'Pop,Soul',
        });
        const rockEarliest = upcomingConcert('Rock', 1);
        const popLater = upcomingConcert('Pop', 48);
        const soulLatest = upcomingConcert('SOUL', 72);
        const jazzLater = upcomingConcert('Jazz', 24);

        await testDbClient.batchInsert(Tables.Artist, [artist]);
        await testDbClient.batchInsert(Tables.Event, [
          rockEarliest,
          popLater,
          soulLatest,
          jazzLater,
        ]);

        expect(await nearbyIds('adele')).toEqual([
          popLater.id,
          soulLatest.id,
          rockEarliest.id,
          jazzLater.id,
        ]);
      });

      it('fills remaining slots with other concerts without duplicates', async () => {
        const artist = artistFactory.build({
          slug: 'adele',
          stage_name: 'Adele',
          genres: 'pop,soul',
        });
        const popMatch = upcomingConcert('Pop', 96);
        const others = [1, 2, 3, 4, 5].map((hours) =>
          upcomingConcert('Metal', hours),
        );

        await testDbClient.batchInsert(Tables.Artist, [artist]);
        await testDbClient.batchInsert(Tables.Event, [...others, popMatch]);

        const ids = await nearbyIds('adele');

        expect(ids).toEqual([
          popMatch.id,
          ...others.slice(0, 3).map((event) => event.id),
        ]);
        expect(new Set(ids).size).toBe(ids.length);
      });
    });

    describe('featuredFestival', () => {
      const festival = (status: EventStatus, hours: number) =>
        buildEvent({
          type: EventType.FESTIVAL,
          status,
          startAt: hoursFromNow(hours),
        });

      const featuredFestival = async (slug: string) => {
        const response = await findArtistBySlug(slug);
        return response.body.data.findArtistBySlug.featuredFestival;
      };

      it('returns the earliest upcoming published festival', async () => {
        const artist = artistFactory.build({
          slug: 'adele',
          stage_name: 'Adele',
        });
        const pastFestival = festival(EventStatus.PUBLISHED, -1);
        const draftFestival = festival(EventStatus.DRAFT, 1);
        const upcomingConcert = buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
          startAt: hoursFromNow(2),
        });
        const laterFestival = festival(EventStatus.PUBLISHED, 72);
        const nextFestival = festival(EventStatus.PUBLISHED, 24);

        await testDbClient.batchInsert(Tables.Artist, [artist]);
        await testDbClient.batchInsert(Tables.Event, [
          pastFestival,
          draftFestival,
          upcomingConcert,
          laterFestival,
          nextFestival,
        ]);

        expect(await featuredFestival('adele')).toEqual({
          id: nextFestival.id,
        });
      });

      it('returns null when no upcoming published festival exists', async () => {
        const artist = artistFactory.build({
          slug: 'adele',
          stage_name: 'Adele',
        });

        await testDbClient.batchInsert(Tables.Artist, [artist]);
        await testDbClient.batchInsert(Tables.Event, [
          festival(EventStatus.PUBLISHED, -1),
          festival(EventStatus.DRAFT, 24),
        ]);

        expect(await featuredFestival('adele')).toBeNull();
      });
    });

    it('returns an empty payload without errors for an unknown slug', async () => {
      const response = await findArtistBySlug('unknown-artist').expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findArtistBySlug).toEqual({
        artist: null,
        eventsByCity: [],
        nearbyEvents: [],
        featuredFestival: null,
      });
    });

    it('should return artist', async () => {
      const artist = artistFactory.build({
        slug: 'the-weeknd',
        stage_name: 'The Weeknd',
        bio: 'Canadian singer known for Blinding Lights.',
      });

      await testDbClient.batchInsert(Tables.Artist, [artist]);
      await testDbClient.batchInsert(Tables.Event, [
        buildEvent({
          type: EventType.CONCERT,
          status: EventStatus.PUBLISHED,
        }),
        buildEvent({
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
