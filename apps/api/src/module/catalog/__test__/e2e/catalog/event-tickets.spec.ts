import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { ticketTypeFactory } from '@catalogModule/__test__/factory/ticket-type.factory';
import { CatalogModule } from '@catalogModule/catalog.module';
import { SeatMapLayout } from '@catalogModule/persistence/entity/seat-map.entity';
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

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
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
                stage {
                  label
                  path
                  labelX
                  labelY
                }
                sections {
                  key
                  label
                  path
                  color
                  labelX
                  labelY
                }
              }
              ticketTypes {
                id
                sectionKey
                name
                priceCents
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
    const event = eventFactory.build({
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
      venue: event.venue,
      city: event.city,
      country: event.country,
      startAt: event.startAt!.toISOString(),
      endsAt: event.endsAt!.toISOString(),
    });
  });

  it('returns a published event starting 1h from now (edge: later today)', async () => {
    const event = eventFactory.build({
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
      const draft = eventFactory.build({
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
      const canceled = eventFactory.build({
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
      const past = eventFactory.build({
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
    it('returns the view box, stage and sections in stored order (SECT-02)', async () => {
      const layout: SeatMapLayout = {
        viewBox: { width: 800, height: 600 },
        stage: {
          label: 'STAGE',
          path: 'M10 10L690 10L690 60L10 60Z',
          labelAt: [350, 35],
        },
        sections: [
          {
            key: 'vip',
            label: 'VIP',
            path: 'M252 200A100 100 0 1 0 452 200A100 100 0 1 0 252 200Z',
            color: '#454545',
            labelAt: [352, 300],
          },
          {
            key: 'a',
            label: 'A',
            path: 'M152 300A200 200 0 1 0 552 300A200 200 0 1 0 152 300Z',
            color: '#303030',
            labelAt: [352, 500],
          },
          {
            key: 'b',
            label: 'B',
            path: 'M100 350A250 250 0 1 0 600 350A250 250 0 1 0 100 350Z',
            color: '#1F1F1F',
            labelAt: [352, 600],
          },
        ],
      };
      const seatMap = seatMapFactory.build({ layout: JSON.stringify(layout) });
      await testDbClient.batchInsert(Tables.SeatMap, [seatMap]);

      const event = {
        ...eventFactory.build({
          status: EventStatus.PUBLISHED,
          startAt: hoursFromNow(24),
        }),
        seatMapId: seatMap.id,
      };
      await testDbClient.batchInsert(Tables.Event, [event]);

      const response = await findEventTickets(event.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event.id).toBe(event.id);
      expect(response.body.data.findEventTickets.seatMap).toEqual({
        id: seatMap.id,
        name: seatMap.name,
        viewBoxWidth: layout.viewBox.width,
        viewBoxHeight: layout.viewBox.height,
        stage: {
          label: layout.stage.label,
          path: layout.stage.path,
          labelX: layout.stage.labelAt[0],
          labelY: layout.stage.labelAt[1],
        },
        sections: layout.sections.map((section) => ({
          key: section.key,
          label: section.label,
          path: section.path,
          color: section.color,
          labelX: section.labelAt[0],
          labelY: section.labelAt[1],
        })),
      });
    });

    it('returns seatMap: null and event present for an event without a seat map (SECT-06)', async () => {
      const event = eventFactory.build({
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

  describe('ticketTypes', () => {
    it('returns exactly the non-deleted ticket types of the queried event, never another event’s (SECT-03)', async () => {
      const eventA = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(24),
      });
      const eventB = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(48),
      });
      await testDbClient.batchInsert(Tables.Event, [eventA, eventB]);

      const ticketTypeA1 = ticketTypeFactory.build({
        eventId: eventA.id!,
        sectionKey: 'vip',
        name: 'VIP',
        priceCents: 45000,
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
      const event = eventFactory.build({
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
      const event = eventFactory.build({
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
  });
});
