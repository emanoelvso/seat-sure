import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { destroyDataSources } from '@testInfra/data-sources.teardown';
import { createNestApp } from '@testInfra/test-e2e.setup';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { TicketingService } from '@ticketingModule/core/service/ticketing.service';
import { TicketingModule } from '@ticketingModule/ticketing.module';
import request from 'supertest';

describe('TicketingResolver findUnavailableSeats (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  const eventId = faker.string.uuid();
  const otherEventId = faker.string.uuid();

  const deleteRows = async () => {
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.Ticket).del();
  };

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([TicketingModule]);

    module = nestTestSetup.module;
    app = nestTestSetup.app;
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient.destroy();
    await destroyDataSources(module);
    await app.getHttpServer().close();
  });

  const fromNow = (ms: number) => new Date(Date.now() + ms);

  const graphql = async (query: string, variables?: object) => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200);

    return response.body;
  };

  const findUnavailableSeats = (id: string) =>
    graphql(
      `
        query FindUnavailableSeats(
          $FindUnavailableSeatsInput: FindUnavailableSeatsInput!
        ) {
          findUnavailableSeats(
            FindUnavailableSeatsInput: $FindUnavailableSeatsInput
          ) {
            seatIds
          }
        }
      `,
      { FindUnavailableSeatsInput: { eventId: id } },
    );

  const sorted = (ids: string[]) => [...ids].sort();

  it('returns the seat of a hold that expires in 10 minutes (SEAT-07)', async () => {
    const hold = seatHoldFactory.build({
      eventId,
      expiresAt: fromNow(10 * 60_000),
    });
    await testDbClient.batchInsert(Tables.SeatHold, [hold]);

    const body = await findUnavailableSeats(eventId);

    expect(body.errors).toBeUndefined();
    expect(body.data.findUnavailableSeats).toEqual({ seatIds: [hold.seatId] });
  });

  // The resolver reads the request time from the clock, so the boundary is
  // checked on the service with a fixed `now`.
  it('returns a hold that expires at the request time and leaves out one that expired 1 ms before (SEAT-07, SEAT-09)', async () => {
    const now = new Date('2026-10-01T12:00:00.000Z');
    const expiresAtNow = seatHoldFactory.build({ eventId, expiresAt: now });
    const expiredJustBefore = seatHoldFactory.build({
      eventId,
      expiresAt: new Date(now.getTime() - 1),
    });
    await testDbClient.batchInsert(Tables.SeatHold, [
      expiresAtNow,
      expiredJustBefore,
    ]);

    const unavailable = await module
      .get(TicketingService)
      .findUnavailableSeats({ eventId, now });

    expect(unavailable).toEqual({ seatIds: [expiresAtNow.seatId] });
  });

  it('returns the seats of issued, used and transferred tickets (SEAT-08)', async () => {
    const tickets = [
      ticketFactory.build({ eventId, status: TicketStatus.ISSUED }),
      ticketFactory.build({ eventId, status: TicketStatus.USED }),
      ticketFactory.build({ eventId, status: TicketStatus.TRANSFERRED }),
    ];
    await testDbClient.batchInsert(Tables.Ticket, tickets);

    const body = await findUnavailableSeats(eventId);

    expect(body.errors).toBeUndefined();
    expect(sorted(body.data.findUnavailableSeats.seatIds)).toEqual(
      sorted(tickets.map((ticket) => ticket.seatId!)),
    );
  });

  describe('SEAT-09: seats that are free for the event', () => {
    it('leaves out an expired hold, cancelled and refunded tickets, and seats taken for another event', async () => {
      const activeHold = seatHoldFactory.build({
        eventId,
        expiresAt: fromNow(10 * 60_000),
      });
      const expiredHold = seatHoldFactory.build({
        eventId,
        expiresAt: fromNow(-1_000),
      });
      const cancelled = ticketFactory.build({
        eventId,
        status: TicketStatus.CANCELLED,
      });
      const refunded = ticketFactory.build({
        eventId,
        status: TicketStatus.REFUNDED,
      });
      const otherEventHold = seatHoldFactory.build({
        eventId: otherEventId,
        expiresAt: fromNow(10 * 60_000),
      });
      const otherEventTicket = ticketFactory.build({
        eventId: otherEventId,
        status: TicketStatus.ISSUED,
      });
      await testDbClient.batchInsert(Tables.SeatHold, [
        activeHold,
        expiredHold,
        otherEventHold,
      ]);
      await testDbClient.batchInsert(Tables.Ticket, [
        cancelled,
        refunded,
        otherEventTicket,
      ]);

      const body = await findUnavailableSeats(eventId);

      expect(body.errors).toBeUndefined();
      expect(body.data.findUnavailableSeats).toEqual({
        seatIds: [activeHold.seatId],
      });
    });

    it('leaves out a soft-deleted hold', async () => {
      const activeHold = seatHoldFactory.build({
        eventId,
        expiresAt: fromNow(10 * 60_000),
      });
      const deletedHold = {
        ...seatHoldFactory.build({
          eventId,
          expiresAt: fromNow(10 * 60_000),
        }),
        deletedAt: new Date(),
      };
      await testDbClient.batchInsert(Tables.SeatHold, [
        activeHold,
        deletedHold,
      ]);

      const body = await findUnavailableSeats(eventId);

      expect(body.errors).toBeUndefined();
      expect(body.data.findUnavailableSeats).toEqual({
        seatIds: [activeHold.seatId],
      });
    });
  });

  describe('SEAT-10: seat ids only, each once', () => {
    it('returns a seat that is both held and sold once', async () => {
      const heldAndSold = faker.string.uuid();
      const expiredHoldAndSold = faker.string.uuid();
      await testDbClient.batchInsert(Tables.SeatHold, [
        seatHoldFactory.build({
          eventId,
          seatId: heldAndSold,
          expiresAt: fromNow(10 * 60_000),
        }),
        seatHoldFactory.build({
          eventId,
          seatId: expiredHoldAndSold,
          expiresAt: fromNow(-1_000),
        }),
      ]);
      await testDbClient.batchInsert(Tables.Ticket, [
        ticketFactory.build({
          eventId,
          seatId: heldAndSold,
          status: TicketStatus.ISSUED,
        }),
        ticketFactory.build({
          eventId,
          seatId: expiredHoldAndSold,
          status: TicketStatus.ISSUED,
        }),
      ]);

      const body = await findUnavailableSeats(eventId);

      expect(body.errors).toBeUndefined();
      expect(sorted(body.data.findUnavailableSeats.seatIds)).toEqual(
        sorted([heldAndSold, expiredHoldAndSold]),
      );
    });

    it('exposes seatIds as the only field of UnavailableSeats', async () => {
      const body = await graphql(`
        {
          __type(name: "UnavailableSeats") {
            fields {
              name
            }
          }
        }
      `);

      expect(body.errors).toBeUndefined();
      expect(body.data.__type.fields).toEqual([{ name: 'seatIds' }]);
    });
  });

  it('returns an empty list without errors when the event id is not a UUID (SEAT-11)', async () => {
    await testDbClient.batchInsert(Tables.SeatHold, [
      seatHoldFactory.build({ eventId, expiresAt: fromNow(10 * 60_000) }),
    ]);

    const body = await findUnavailableSeats('not-a-uuid');

    expect(body.errors).toBeUndefined();
    expect(body.data.findUnavailableSeats).toEqual({ seatIds: [] });
  });
});
