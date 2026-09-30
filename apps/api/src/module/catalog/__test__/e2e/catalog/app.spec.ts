import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '@src/app.module';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

describe('AppModule (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  const venue = venueFactory.build();

  beforeAll(async () => {
    // Boots AppModule alone: createNestApp() always adds GraphqlModule, which
    // would hide AppModule's own GraphQL wiring
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    await testDbClient.batchInsert(Tables.Venue, [venue]);
  });

  beforeEach(async () => {
    await testDbClient(Tables.Event).del();
  });

  afterAll(async () => {
    await testDbClient(Tables.Event).del();
    await testDbClient(Tables.Venue).where({ id: venue.id }).del();
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.getHttpServer().close();
  });

  it('answers Catalog queries when booted from AppModule', async () => {
    const concert = eventFactory.build({
      type: EventType.CONCERT,
      status: EventStatus.PUBLISHED,
      venueId: venue.id,
    });
    await testDbClient.batchInsert(Tables.Event, [concert]);

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
  query GetHomeSections {
    getHomeSections {
      concerts {
        events {
          id
        }
      }
    }
  }
        `,
      });

    expect(response.body.errors).toBeUndefined();
    const concertIds = response.body.data.getHomeSections.concerts.events.map(
      (event: { id: string }) => event.id,
    );
    expect(concertIds).toContain(concert.id);
  });
});
