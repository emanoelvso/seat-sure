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

describe('CatalogResolver findEventTickets (e2e)', () => {
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
    it('returns event: null for an unknown UUID', async () => {
      const response = await findEventTickets(
        '00000000-0000-0000-0000-000000000000',
      ).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
    });

    it('returns event: null for a draft event', async () => {
      const draft = eventFactory.build({
        status: EventStatus.DRAFT,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [draft]);

      const response = await findEventTickets(draft.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
    });

    it('returns event: null for a canceled event', async () => {
      const canceled = eventFactory.build({
        status: EventStatus.CANCELED,
        startAt: hoursFromNow(24),
      });
      await testDbClient.batchInsert(Tables.Event, [canceled]);

      const response = await findEventTickets(canceled.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
    });

    it('returns event: null for a past published event', async () => {
      const past = eventFactory.build({
        status: EventStatus.PUBLISHED,
        startAt: hoursFromNow(-1),
      });
      await testDbClient.batchInsert(Tables.Event, [past]);

      const response = await findEventTickets(past.id!).expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.findEventTickets.event).toBeNull();
    });
  });

  it('returns event: null without errors for a malformed id (SECT-05)', async () => {
    const response = await findEventTickets('not-a-uuid').expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findEventTickets.event).toBeNull();
  });
});
