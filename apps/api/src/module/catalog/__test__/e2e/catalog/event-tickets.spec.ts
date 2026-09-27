import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
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
    });
  });

  it('returns event: null and seatMap: null without errors for a malformed id (SECT-05)', async () => {
    const response = await findEventTickets('not-a-uuid').expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event).toBeNull();
    expect(response.body.data.findEventTickets.seatMap).toBeNull();
  });

  describe('seatMap', () => {
    it('returns the view box, stage and sections in stored order (SECT-02)', async () => {
      const layout: SeatMapLayout = {
        viewBox: { width: 704, height: 704 },
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
});
