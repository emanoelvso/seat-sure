import { artistFactory } from '@catalogModule/__test__/factory/artist.factory';
import { eventArtistFactory } from '@catalogModule/__test__/factory/event-artist.factory';
import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { ticketTypeRowPriceFactory } from '@catalogModule/__test__/factory/ticket-type-row-price.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { CatalogModule } from '@catalogModule/catalog.module';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';
import { Migration1790600000000 } from '@catalogModule/persistence/migration/1790600000000-migration';
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

describe('CatalogResolver findEventTickets (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  // Two venues whose name, city and country all differ, so a response can only
  // match one of them.
  const venue = venueFactory.build({
    name: 'Allianz Parque',
    city: 'São Paulo',
    state: 'SP',
    country: 'Brazil',
  });
  const otherVenue = venueFactory.build({
    name: 'The O2 Arena',
    city: 'London',
    state: 'England',
    country: 'United Kingdom',
  });

  const buildEvent = (
    overrides: Parameters<typeof eventFactory.build>[0] = {},
  ) => eventFactory.build({ venueId: venue.id, ...overrides });

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
    await testDbClient.batchInsert(Tables.Venue, [venue, otherVenue]);
  });

  beforeEach(async () => {
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Artist).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.EventArtist).del();
    await testDbClient(Tables.Artist).del();
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.SeatMap).del();
    await testDbClient(Tables.Venue)
      .whereIn('id', [venue.id, otherVenue.id])
      .del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 3_600_000);

  const findEventTickets = (eventId: string) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query FindEventTickets($FindEventTicketsInput: FindEventTicketsInput!) {
            findEventTickets(FindEventTicketsInput: $FindEventTicketsInput) {
              event {
                id
                name
                coverImage
                venue
                city
                country
                startAt
                endsAt
              }
              seatMap {
                id
                name
                viewBoxWidth
                viewBoxHeight
                labelSize
                labelWeight
                stage {
                  label
                  labelX
                  labelY
                  shapes {
                    path
                    color
                  }
                }
                sections {
                  key
                  label
                  color
                  shapes {
                    path
                    labelX
                    labelY
                    labelRotation
                  }
                }
              }
              ticketTypes {
                id
                sectionKey
                name
                priceCents
                serviceFeeCents
                taxCents
                currency
                seatsAvailable
                maxPerOrder
                tags
              }
            }
          }
        `,
        variables: { FindEventTicketsInput: { eventId } },
      });

  it('returns the event fields of a published event whose startAt is tomorrow (SECT-01)', async () => {
    const event = buildEvent({
      type: EventType.CONCERT,
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(24),
    });

    await testDbClient.batchInsert(Tables.Event, [event]);

    const response = await findEventTickets(event.id!).expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event).toEqual({
      id: event.id,
      name: event.name,
      coverImage: event.coverImage,
      venue: venue.name,
      city: venue.city,
      country: venue.country,
      startAt: event.startAt!.toISOString(),
      endsAt: event.endsAt!.toISOString(),
    });
  });

  it('returns each event with the name, city and country of its own venue (ALIGN-10)', async () => {
    const atVenue = buildEvent({
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(24),
    });
    const atOtherVenue = buildEvent({
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(48),
      venueId: otherVenue.id,
    });

    await testDbClient.batchInsert(Tables.Event, [atVenue, atOtherVenue]);

    const first = await findEventTickets(atVenue.id!).expect(200);
    const second = await findEventTickets(atOtherVenue.id!).expect(200);

    expect(first.body.errors).toBeUndefined();
    expect(first.body.data.findEventTickets.event).toMatchObject({
      id: atVenue.id,
      venue: venue.name,
      city: venue.city,
      country: venue.country,
    });
    expect(second.body.errors).toBeUndefined();
    expect(second.body.data.findEventTickets.event).toMatchObject({
      id: atOtherVenue.id,
      venue: otherVenue.name,
      city: otherVenue.city,
      country: otherVenue.country,
    });
  });

  it('returns a startAt written with a +09:00 offset as the same instant in UTC (ALIGN-27)', async () => {
    const instant = new Date(
      Math.floor(hoursFromNow(48).getTime() / 1000) * 1000,
    );
    const plusNineOffset = `${new Date(instant.getTime() + 9 * 3_600_000)
      .toISOString()
      .slice(0, 19)}+09:00`;
    const event = buildEvent({ status: EventStatus.PUBLISHED });

    await testDbClient.batchInsert(Tables.Event, [
      { ...event, startAt: plusNineOffset },
    ]);

    const response = await findEventTickets(event.id!).expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event.startAt).toBe(
      instant.toISOString(),
    );
  });

  it('returns the headliner of the requested event, or null without one (NAV-17)', async () => {
    const adele = artistFactory.build({
      slug: 'hello-adkins',
      stage_name: 'Adele',
    });
    const coldplay = artistFactory.build({
      slug: 'viva-chris',
      stage_name: 'Coldplay',
    });
    const adeleConcert = buildEvent({
      name: 'Adele Live',
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(24),
    });
    const coldplayConcert = buildEvent({
      name: 'Music of the Spheres',
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(48),
    });
    const match = buildEvent({
      type: EventType.SPORT,
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(72),
    });

    await testDbClient.batchInsert(Tables.Artist, [adele, coldplay]);
    await testDbClient.batchInsert(Tables.Event, [
      adeleConcert,
      coldplayConcert,
      match,
    ]);
    await testDbClient.batchInsert(Tables.EventArtist, [
      eventArtistFactory.build({
        eventId: adeleConcert.id,
        artistId: adele.id,
      }),
      eventArtistFactory.build({
        eventId: coldplayConcert.id,
        artistId: coldplay.id,
      }),
    ]);

    const findEvent = async (eventId: string) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindEventTickets($FindEventTicketsInput: FindEventTicketsInput!) {
              findEventTickets(FindEventTicketsInput: $FindEventTicketsInput) {
                event {
                  id
                  headliner {
                    slug
                    name
                  }
                }
              }
            }
          `,
          variables: { FindEventTicketsInput: { eventId } },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      return response.body.data.findEventTickets.event;
    };

    expect(await findEvent(adeleConcert.id!)).toEqual({
      id: adeleConcert.id,
      headliner: { slug: 'hello-adkins', name: 'Adele' },
    });
    expect(await findEvent(coldplayConcert.id!)).toEqual({
      id: coldplayConcert.id,
      headliner: { slug: 'viva-chris', name: 'Coldplay' },
    });
    expect(await findEvent(match.id!)).toEqual({
      id: match.id,
      headliner: null,
    });
  });

  it('returns a published event starting 1h from now (edge: later today)', async () => {
    const event = buildEvent({
      status: EventStatus.PUBLISHED,
      startAt: hoursFromNow(1),
    });

    await testDbClient.batchInsert(Tables.Event, [event]);

    const response = await findEventTickets(event.id!).expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event.id).toBe(event.id);
  });

  describe('SECT-04: unknown, unpublished or past events', () => {
    it('returns event: null and seatMap: null for an unknown UUID', async () => {
      const response = await findEventTickets(
        '00000000-0000-0000-0000-000000000000',
      ).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
      expect(response.body.data.findEventTickets.seatMap).toBeNull();
      expect(response.body.data.findEventTickets.ticketTypes).toEqual([]);
    });

    it('returns event: null and seatMap: null for a draft event', async () => {
      const draft = buildEvent({
        status: EventStatus.DRAFT,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [draft]);

      const response = await findEventTickets(draft.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
      expect(response.body.data.findEventTickets.seatMap).toBeNull();
      expect(response.body.data.findEventTickets.ticketTypes).toEqual([]);
    });

    it('returns event: null and seatMap: null for a canceled event', async () => {
      const canceled = buildEvent({
        status: EventStatus.CANCELED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [canceled]);

      const response = await findEventTickets(canceled.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
      expect(response.body.data.findEventTickets.seatMap).toBeNull();
      expect(response.body.data.findEventTickets.ticketTypes).toEqual([]);
    });

    it('returns event: null and seatMap: null for a past published event', async () => {
      const past = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(-1),
      });
      await testDbClient.batchInsert(Tables.Event, [past]);

      const response = await findEventTickets(past.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
      expect(response.body.data.findEventTickets.seatMap).toBeNull();
      expect(response.body.data.findEventTickets.ticketTypes).toEqual([]);
    });
  });

  it('returns event: null and seatMap: null without errors for a malformed id (SECT-05)', async () => {
    const response = await findEventTickets('not-a-uuid').expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event).toBeNull();
    expect(response.body.data.findEventTickets.seatMap).toBeNull();
    expect(response.body.data.findEventTickets.ticketTypes).toEqual([]);
  });

  describe('seatMap', () => {
    const insertEventWithLayout = async (layout: SeatMapLayout) => {
      const seatMap = seatMapFactory.build({
        venueId: venue.id,
        layout: JSON.stringify(layout),
      });
      await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);

      const event = {
        ...buildEvent({
          status: EventStatus.PUBLISHED,
          startAt: hoursFromNow(24),
        }),
        seatMapId: seatMap.id,
      };
      await testDbClient.batchInsert(Tables.Event, [event]);

      return { seatMap, event };
    };

    it('returns the view box, label style, stage and sections in stored order (SECT-02)', async () => {
      const layout: SeatMapLayout = {
        viewBox: { width: 800, height: 600 },
        labelStyle: { size: 24, weight: 700 },
        stage: {
          label: 'STAGE',
          labelAt: [350, 35],
          shapes: [{ path: 'M10 10L690 10L690 60L10 60Z', color: '#999999' }],
        },
        sections: [
          {
            key: 'vip',
            label: 'VIP',
            color: '#454545',
            shapes: [
              {
                path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
                labelAt: [352, 300],
                labelRotation: 0,
              },
            ],
          },
          {
            key: 'a',
            label: 'A',
            color: '#303030',
            shapes: [
              {
                path: 'M152 300A200 200 0 1 0 552 300A200 200 0 1 0 152 300Z',
                labelAt: [352, 500],
                labelRotation: 0,
              },
            ],
          },
          {
            key: 'b',
            label: 'B',
            color: '#1F1F1F',
            shapes: [
              {
                path: 'M100 350A250 250 0 1 0 600 350A250 250 0 1 0 100 350Z',
                labelAt: [352, 600],
                labelRotation: 0,
              },
            ],
          },
        ],
      };
      const { seatMap, event } = await insertEventWithLayout(layout);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event.id).toBe(event.id);
      expect(response.body.data.findEventTickets.seatMap).toEqual({
        id: seatMap.id,
        name: seatMap.name,
        viewBoxWidth: 800,
        viewBoxHeight: 600,
        labelSize: 24,
        labelWeight: 700,
        stage: {
          label: 'STAGE',
          labelX: 350,
          labelY: 35,
          shapes: [{ path: 'M10 10L690 10L690 60L10 60Z', color: '#999999' }],
        },
        sections: layout.sections.map((section) => ({
          key: section.key,
          label: section.label,
          color: section.color,
          shapes: section.shapes.map((shape) => ({
            path: shape.path,
            labelX: shape.labelAt[0],
            labelY: shape.labelAt[1],
            labelRotation: shape.labelRotation,
          })),
        })),
      });
    });

    it('returns a section drawn as several blocks once, with its shapes in stored order (STAD-01)', async () => {
      const layout: SeatMapLayout = {
        viewBox: { width: 704, height: 860 },
        labelStyle: { size: 16, weight: 400 },
        stage: {
          label: 'PITCH',
          labelAt: [352, 430],
          shapes: [
            { path: 'M200 300L500 300L500 560L200 560Z', color: '#999999' },
            { path: 'M180 300L195 300L195 560L180 560Z', color: '#454545' },
          ],
        },
        sections: [
          {
            key: 't.standard',
            label: 'T.STANDARD',
            color: '#1B1B1B',
            shapes: [
              {
                path: 'M20 200L90 110L120 130L50 220Z',
                labelAt: [96.8, 172.3],
                labelRotation: -57,
              },
              {
                path: 'M200 20L520 20L520 60L200 60Z',
                labelAt: [362.2, 40.6],
                labelRotation: 0,
              },
              {
                path: 'M600 110L680 200L650 220L580 130Z',
                labelAt: [625.4, 185.7],
                labelRotation: 55,
              },
            ],
          },
          {
            key: 't.gold',
            label: 'T.GOLD',
            color: '#303030',
            shapes: [
              {
                path: 'M250 210L460 210L460 250L250 250Z',
                labelAt: [356.4, 232.8],
                labelRotation: 0,
              },
            ],
          },
        ],
      };
      const { event } = await insertEventWithLayout(layout);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      const seatMap = response.body.data.findEventTickets.seatMap;
      expect(seatMap.labelSize).toBe(16);
      expect(seatMap.labelWeight).toBe(400);
      expect(seatMap.stage.shapes).toEqual([
        { path: 'M200 300L500 300L500 560L200 560Z', color: '#999999' },
        { path: 'M180 300L195 300L195 560L180 560Z', color: '#454545' },
      ]);
      expect(seatMap.sections).toEqual([
        {
          key: 't.standard',
          label: 'T.STANDARD',
          color: '#1B1B1B',
          shapes: [
            {
              path: 'M20 200L90 110L120 130L50 220Z',
              labelX: 96.8,
              labelY: 172.3,
              labelRotation: -57,
            },
            {
              path: 'M200 20L520 20L520 60L200 60Z',
              labelX: 362.2,
              labelY: 40.6,
              labelRotation: 0,
            },
            {
              path: 'M600 110L680 200L650 220L580 130Z',
              labelX: 625.4,
              labelY: 185.7,
              labelRotation: 55,
            },
          ],
        },
        {
          key: 't.gold',
          label: 'T.GOLD',
          color: '#303030',
          shapes: [
            {
              path: 'M250 210L460 210L460 250L250 250Z',
              labelX: 356.4,
              labelY: 232.8,
              labelRotation: 0,
            },
          ],
        },
      ]);
    });

    it('returns stage.label, labelX and labelY as null for a stage without a label (STAD-03)', async () => {
      const layout: SeatMapLayout = {
        viewBox: { width: 704, height: 860 },
        labelStyle: { size: 16, weight: 400 },
        stage: {
          label: null,
          labelAt: null,
          shapes: [
            { path: 'M200 300L500 300L500 560L200 560Z', color: '#999999' },
          ],
        },
        sections: [
          {
            key: 'vip',
            label: 'VIP',
            color: '#454545',
            shapes: [
              {
                path: 'M120 300L160 300L160 560L120 560Z',
                labelAt: [143.6, 429],
                labelRotation: -90,
              },
            ],
          },
        ],
      };
      const { event } = await insertEventWithLayout(layout);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.seatMap.stage).toEqual({
        label: null,
        labelX: null,
        labelY: null,
        shapes: [
          { path: 'M200 300L500 300L500 560L200 560Z', color: '#999999' },
        ],
      });
    });

    it('returns seatMap: null and event present for an event without a seat map (SECT-06)', async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [event]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event.id).toBe(event.id);
      expect(response.body.data.findEventTickets.seatMap).toBeNull();
    });
  });

  describe('layout v1 to v2 migration (Migration1790600000000)', () => {
    const v1Layout = {
      viewBox: { width: 704, height: 704 },
      stage: {
        label: 'STAGE',
        path: 'M116.5 90C171 35.5 586 90 586 90L116.5 90Z',
        labelAt: [352, 89],
      },
      sections: [
        {
          key: 'vip',
          label: 'VIP',
          path: 'M183 352A168 168 0 1 0 520 352A168 168 0 1 0 183 352Z',
          color: '#454545',
          labelAt: [351, 353],
        },
        {
          key: 'a',
          label: 'A',
          path: 'M516 189C548 221 570 262 579 307L483 221Z',
          color: '#303030',
          labelAt: [350, 562],
        },
        {
          key: 'c',
          label: 'C',
          path: 'M600 103C650 152 683 215 697 283L566 137Z',
          color: '#191919',
          labelAt: [349, 684],
        },
      ],
    };

    // The migration's SQL names the table before the Catalog prefix, so a
    // session-scoped view maps "SeatMap" to "CatalogSeatMap" while it runs.
    const runMigrationUp = async () => {
      const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
      const queryRunner = dataSource.createQueryRunner();
      try {
        await queryRunner.query(
          'CREATE OR REPLACE TEMP VIEW "SeatMap" AS SELECT * FROM "CatalogSeatMap"',
        );
        await new Migration1790600000000().up(queryRunner);
      } finally {
        await queryRunner.query('DROP VIEW IF EXISTS pg_temp."SeatMap"');
        await queryRunner.release();
      }
    };

    const readLayout = async (seatMapId: string) =>
      (await testDbClient(Tables.SeatMap).where({ id: seatMapId }).first())
        .layout;

    it('serves a migrated v1 layout with label style 24/700, one #999999 stage shape and one unrotated shape per section in stored order (STAD-02)', async () => {
      const seatMap = seatMapFactory.build({
        venueId: venue.id,
        layout: JSON.stringify(v1Layout),
      });
      await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);

      await runMigrationUp();

      const event = {
        ...buildEvent({
          status: EventStatus.PUBLISHED,
          startAt: hoursFromNow(24),
        }),
        seatMapId: seatMap.id,
      };
      await testDbClient.batchInsert(Tables.Event, [event]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.seatMap).toEqual({
        id: seatMap.id,
        name: seatMap.name,
        viewBoxWidth: 704,
        viewBoxHeight: 704,
        labelSize: 24,
        labelWeight: 700,
        stage: {
          label: 'STAGE',
          labelX: 352,
          labelY: 89,
          shapes: [
            {
              path: 'M116.5 90C171 35.5 586 90 586 90L116.5 90Z',
              color: '#999999',
            },
          ],
        },
        sections: [
          {
            key: 'vip',
            label: 'VIP',
            color: '#454545',
            shapes: [
              {
                path: 'M183 352A168 168 0 1 0 520 352A168 168 0 1 0 183 352Z',
                labelX: 351,
                labelY: 353,
                labelRotation: 0,
              },
            ],
          },
          {
            key: 'a',
            label: 'A',
            color: '#303030',
            shapes: [
              {
                path: 'M516 189C548 221 570 262 579 307L483 221Z',
                labelX: 350,
                labelY: 562,
                labelRotation: 0,
              },
            ],
          },
          {
            key: 'c',
            label: 'C',
            color: '#191919',
            shapes: [
              {
                path: 'M600 103C650 152 683 215 697 283L566 137Z',
                labelX: 349,
                labelY: 684,
                labelRotation: 0,
              },
            ],
          },
        ],
      });
    });

    it('leaves layouts that are already v2 unchanged when up runs again (guard)', async () => {
      const v2Layout: SeatMapLayout = {
        viewBox: { width: 704, height: 860 },
        labelStyle: { size: 16, weight: 400 },
        stage: {
          label: null,
          labelAt: null,
          shapes: [
            { path: 'M200 300L500 300L500 560L200 560Z', color: '#454545' },
          ],
        },
        sections: [
          {
            key: 't.standard',
            label: 'T.STANDARD',
            color: '#1B1B1B',
            shapes: [
              {
                path: 'M20 200L90 110L120 130L50 220Z',
                labelAt: [96.8, 172.3],
                labelRotation: -57,
              },
              {
                path: 'M600 110L680 200L650 220L580 130Z',
                labelAt: [625.4, 185.7],
                labelRotation: 55,
              },
            ],
          },
        ],
      };
      const v1SeatMap = seatMapFactory.build({
        venueId: venue.id,
        layout: JSON.stringify(v1Layout),
      });
      const v2SeatMap = seatMapFactory.build({
        venueId: venue.id,
        layout: JSON.stringify(v2Layout),
      });
      await testDbClient.batchInsert(Tables.SeatMap, [v1SeatMap, v2SeatMap]);

      await runMigrationUp();
      const migratedOnce = await readLayout(v1SeatMap.id);

      await runMigrationUp();

      expect(await readLayout(v1SeatMap.id)).toEqual(migratedOnce);
      expect(await readLayout(v2SeatMap.id)).toEqual(v2Layout);
    });
  });

  describe('ticketTypes', () => {
    it('returns exactly the non-deleted ticket types of the queried event, never another event’s (SECT-03)', async () => {
      const eventA = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      const eventB = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(48),
      });
      await testDbClient.batchInsert(Tables.Event, [eventA, eventB]);

      const ticketTypeA1 = ticketTypeFactory.build({
        eventId: eventA.id!,
        sectionKey: 'vip',
        name: 'VIP',
        priceCents: 45000,
        serviceFeeCents: 6750,
        taxCents: 3600,
        currency: 'EUR',
        seatsAvailable: 40,
        maxPerOrder: 6,
        tags: 'discounted,vip',
      });
      const ticketTypeA2 = ticketTypeFactory.build({
        eventId: eventA.id!,
        sectionKey: 'a',
        name: 'A',
        priceCents: 40000,
        serviceFeeCents: 5000,
        taxCents: 2800,
        currency: 'USD',
        seatsAvailable: 120,
        maxPerOrder: 10,
        tags: 'discounted,best seller',
      });
      const ticketTypeB = ticketTypeFactory.build({
        eventId: eventB.id!,
        sectionKey: 'vip',
        name: 'VIP',
        priceCents: 50000,
        seatsAvailable: 10,
        maxPerOrder: 4,
        tags: null,
      });
      await testDbClient.batchInsert(Tables.TicketType, [
        ticketTypeA1,
        ticketTypeA2,
        ticketTypeB,
      ]);

      const response = await findEventTickets(eventA.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.ticketTypes).toHaveLength(2);
      expect(response.body.data.findEventTickets.ticketTypes).toEqual(
        expect.arrayContaining([
          {
            id: ticketTypeA1.id,
            sectionKey: ticketTypeA1.sectionKey,
            name: ticketTypeA1.name,
            priceCents: ticketTypeA1.priceCents,
            serviceFeeCents: ticketTypeA1.serviceFeeCents,
            taxCents: ticketTypeA1.taxCents,
            currency: ticketTypeA1.currency,
            seatsAvailable: ticketTypeA1.seatsAvailable,
            maxPerOrder: ticketTypeA1.maxPerOrder,
            tags: ticketTypeA1.tags!.split(','),
          },
          {
            id: ticketTypeA2.id,
            sectionKey: ticketTypeA2.sectionKey,
            name: ticketTypeA2.name,
            priceCents: ticketTypeA2.priceCents,
            serviceFeeCents: ticketTypeA2.serviceFeeCents,
            taxCents: ticketTypeA2.taxCents,
            currency: ticketTypeA2.currency,
            seatsAvailable: ticketTypeA2.seatsAvailable,
            maxPerOrder: ticketTypeA2.maxPerOrder,
            tags: ticketTypeA2.tags!.split(','),
          },
        ]),
      );
      expect(
        response.body.data.findEventTickets.ticketTypes.map(
          (t: { id: string }) => t.id,
        ),
      ).not.toContain(ticketTypeB.id);
    });

    it('excludes a soft-deleted ticket type (SECT-03)', async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [event]);

      const active = ticketTypeFactory.build({ eventId: event.id! });
      const deleted = {
        ...ticketTypeFactory.build({ eventId: event.id! }),
        deletedAt: new Date(),
      };
      await testDbClient.batchInsert(Tables.TicketType, [active, deleted]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      const ids = response.body.data.findEventTickets.ticketTypes.map(
        (t: { id: string }) => t.id,
      );
      expect(ids).toEqual([active.id]);
      expect(ids).not.toContain(deleted.id);
    });

    it('returns tags: [] for a ticket type with NULL tags', async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [event]);

      const ticketType = ticketTypeFactory.build({
        eventId: event.id!,
        tags: null,
      });
      await testDbClient.batchInsert(Tables.TicketType, [ticketType]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.ticketTypes[0].tags).toEqual(
        [],
      );
    });

    it('defaults serviceFeeCents and taxCents to 0 when the columns are not set on insert (PAY-64)', async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [event]);

      const ticketType = ticketTypeFactory.build({ eventId: event.id! }) as {
        serviceFeeCents?: number;
        taxCents?: number;
      };
      delete ticketType.serviceFeeCents;
      delete ticketType.taxCents;
      await testDbClient.batchInsert(Tables.TicketType, [ticketType]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.ticketTypes[0]).toEqual(
        expect.objectContaining({ serviceFeeCents: 0, taxCents: 0 }),
      );
    });
  });

  describe('maxPriceCents', () => {
    const findMaxPrices = async (eventId: string) => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query FindEventTickets($FindEventTicketsInput: FindEventTicketsInput!) {
              findEventTickets(FindEventTicketsInput: $FindEventTicketsInput) {
                ticketTypes {
                  id
                  priceCents
                  maxPriceCents
                }
              }
            }
          `,
          variables: { FindEventTicketsInput: { eventId } },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      return new Map<string, { priceCents: number; maxPriceCents: number }>(
        response.body.data.findEventTickets.ticketTypes.map(
          (t: { id: string; priceCents: number; maxPriceCents: number }) => [
            t.id,
            t,
          ],
        ),
      );
    };

    it('is the base price plus the highest row premium, and the base price without premiums (PRICE-10, PRICE-11)', async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [event]);
      const withPremiums = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'vip',
        priceCents: 45000,
      });
      const withoutPremiums = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'a',
        priceCents: 40000,
      });
      const onlyZeroPremium = ticketTypeFactory.build({
        eventId: event.id!,
        sectionKey: 'b',
        priceCents: 30000,
      });
      await testDbClient.batchInsert(Tables.TicketType, [
        withPremiums,
        withoutPremiums,
        onlyZeroPremium,
      ]);
      await testDbClient.batchInsert(Tables.TicketTypeRowPrice, [
        ticketTypeRowPriceFactory.build({
          ticketTypeId: withPremiums.id,
          row: '1',
          premiumCents: 15000,
        }),
        ticketTypeRowPriceFactory.build({
          ticketTypeId: withPremiums.id,
          row: '2',
          premiumCents: 0,
        }),
        ticketTypeRowPriceFactory.build({
          ticketTypeId: onlyZeroPremium.id,
          row: '1',
          premiumCents: 0,
        }),
      ]);

      const prices = await findMaxPrices(event.id!);

      expect(prices.get(withPremiums.id)).toMatchObject({
        priceCents: 45000,
        maxPriceCents: 60000,
      });
      expect(prices.get(withoutPremiums.id)).toMatchObject({
        priceCents: 40000,
        maxPriceCents: 40000,
      });
      expect(prices.get(onlyZeroPremium.id)).toMatchObject({
        priceCents: 30000,
        maxPriceCents: 30000,
      });
    });

    it("ignores another event's ticket type premiums", async () => {
      const event = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      const otherEvent = buildEvent({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(48),
      });
      await testDbClient.batchInsert(Tables.Event, [event, otherEvent]);
      const ticketType = ticketTypeFactory.build({
        eventId: event.id!,
        priceCents: 45000,
      });
      const otherTicketType = ticketTypeFactory.build({
        eventId: otherEvent.id!,
        priceCents: 45000,
      });
      await testDbClient.batchInsert(Tables.TicketType, [
        ticketType,
        otherTicketType,
      ]);
      await testDbClient.batchInsert(Tables.TicketTypeRowPrice, [
        ticketTypeRowPriceFactory.build({
          ticketTypeId: otherTicketType.id,
          row: '1',
          premiumCents: 15000,
        }),
      ]);

      const prices = await findMaxPrices(event.id!);

      expect(prices.get(ticketType.id)?.maxPriceCents).toBe(45000);
    });
  });
});
