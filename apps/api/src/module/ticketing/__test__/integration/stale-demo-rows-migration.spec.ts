import { eventFactory } from '@catalogModule/__test__/factory/event.factory';
import { seatMapFactory } from '@catalogModule/__test__/factory/seat-map.factory';
import { seatFactory } from '@catalogModule/__test__/factory/seat.factory';
import { venueFactory } from '@catalogModule/__test__/factory/venue.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import {
  orderFactory,
  orderItemFactory,
} from '@ticketingModule/__test__/factory/order.factory';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { Migration1791923900000 } from '@ticketingModule/persistence/migration/1791923900000-migration';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { DataSource, QueryRunner } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// The demo user of the seat availability seed (1790881300000)
const DEMO_USER_ID = 'de000000-0000-4000-8000-000000000000';

// Catalog and Ticketing rows are written and read inside one transaction that
// is rolled back, starting from empty tables.
describe('Stale demo rows migration (Migration1791923900000)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const venue = venueFactory.build();
  const otherVenue = venueFactory.build();
  const seatMap = seatMapFactory.build({ venueId: venue.id });
  const otherSeatMap = seatMapFactory.build({ venueId: otherVenue.id });
  const [seatA, seatB, seatC, seatD] = seatFactory.buildList(4, {
    seatMapId: seatMap.id,
  });
  const otherMapSeat = seatFactory.build({ seatMapId: otherSeatMap.id });

  // The event that kept its map and the one that lost it
  const keptEvent = {
    ...eventFactory.build({ venueId: venue.id }),
    seatMapId: seatMap.id,
  };
  const unmappedEvent = {
    ...eventFactory.build({ venueId: venue.id }),
    seatMapId: null,
  };

  const demoTicket = (eventId: string, seatId: string) =>
    ticketFactory.build({ eventId, seatId, userId: DEMO_USER_ID });
  const demoHold = (eventId: string, seatId: string) =>
    seatHoldFactory.build({ eventId, seatId, userId: DEMO_USER_ID });

  const keptDemoTicket = demoTicket(keptEvent.id!, seatA.id);
  const keptDemoHold = demoHold(keptEvent.id!, seatB.id);
  const unmappedDemoTicket = demoTicket(unmappedEvent.id!, seatA.id);
  const unmappedDemoHold = demoHold(unmappedEvent.id!, seatB.id);
  const otherMapDemoTicket = demoTicket(keptEvent.id!, otherMapSeat.id);
  const otherMapDemoHold = demoHold(keptEvent.id!, otherMapSeat.id);

  // Non-demo rows on seats of their event's map, or without a seat
  const buyerTicket = ticketFactory.build({
    eventId: keptEvent.id!,
    seatId: seatC.id,
  });
  const buyerHold = seatHoldFactory.build({
    eventId: keptEvent.id!,
    seatId: seatD.id,
  });
  const seatlessTicket = ticketFactory.build({
    eventId: unmappedEvent.id!,
    seatId: null,
  });
  const buyerOrder = orderFactory.build({ eventId: keptEvent.id! });
  const buyerOrderItem = orderItemFactory.build({
    orderId: buyerOrder.id,
    seatId: seatC.id,
  });

  const insert = async (table: Tables, rows: object[]) => {
    const { sql, bindings } = testDbClient(table)
      .insert(rows)
      .toSQL()
      .toNative();
    await queryRunner.query(sql, bindings as unknown[]);
  };

  const idsIn = async (table: Tables) =>
    (
      (await queryRunner.query(`SELECT id FROM "${table}" ORDER BY id`)) as {
        id: string;
      }[]
    ).map(({ id }) => id);

  const sorted = (ids: string[]) => [...ids].sort();

  const seed = async () => {
    await insert(Tables.Venue, [venue, otherVenue]);
    await insert(Tables.SeatMap, [seatMap, otherSeatMap]);
    await insert(Tables.Seat, [seatA, seatB, seatC, seatD, otherMapSeat]);
    await insert(Tables.Event, [keptEvent, unmappedEvent]);
    await insert(Tables.Ticket, [
      keptDemoTicket,
      unmappedDemoTicket,
      otherMapDemoTicket,
      buyerTicket,
      seatlessTicket,
    ]);
    await insert(Tables.SeatHold, [
      keptDemoHold,
      unmappedDemoHold,
      otherMapDemoHold,
      buyerHold,
    ]);
    await insert(Tables.Order, [buyerOrder]);
    await insert(Tables.OrderItem, [buyerOrderItem]);
  };

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    for (const table of [
      Tables.OrderItem,
      Tables.Order,
      Tables.Ticket,
      Tables.SeatHold,
      Tables.Seat,
      Tables.TicketType,
      Tables.EventArtist,
      Tables.Event,
      Tables.SeatMap,
    ]) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("deletes demo tickets and holds whose seat is not on their event's seat map (VMAP-10)", async () => {
    await seed();

    await new Migration1791923900000().up(queryRunner);

    const tickets = await idsIn(Tables.Ticket);
    const holds = await idsIn(Tables.SeatHold);
    for (const stale of [unmappedDemoTicket, otherMapDemoTicket]) {
      expect(tickets).not.toContain(stale.id);
    }
    for (const stale of [unmappedDemoHold, otherMapDemoHold]) {
      expect(holds).not.toContain(stale.id);
    }
  });

  it("keeps demo rows on their event's seat map and every non-demo row (VMAP-11)", async () => {
    await seed();

    await new Migration1791923900000().up(queryRunner);

    expect(await idsIn(Tables.Ticket)).toEqual(
      sorted([keptDemoTicket.id, buyerTicket.id, seatlessTicket.id]),
    );
    expect(await idsIn(Tables.SeatHold)).toEqual(
      sorted([keptDemoHold.id, buyerHold.id]),
    );
    expect(await idsIn(Tables.OrderItem)).toEqual([buyerOrderItem.id]);
  });

  it.each([
    [
      'ticket',
      () =>
        insert(Tables.Ticket, [
          ticketFactory.build({
            eventId: unmappedEvent.id!,
            seatId: seatD.id,
          }),
        ]),
      'tickets 1, holds 0, order items 0',
    ],
    [
      'hold',
      () =>
        insert(Tables.SeatHold, [
          seatHoldFactory.build({
            eventId: unmappedEvent.id!,
            seatId: seatC.id,
          }),
        ]),
      'tickets 0, holds 1, order items 0',
    ],
    [
      'order item',
      async () => {
        const order = orderFactory.build({ eventId: unmappedEvent.id! });
        await insert(Tables.Order, [order]);
        await insert(Tables.OrderItem, [
          orderItemFactory.build({ orderId: order.id, seatId: seatC.id }),
        ]);
      },
      'tickets 0, holds 0, order items 1',
    ],
  ])(
    "throws and deletes nothing when a non-demo %s is off its event's seat map (VMAP-12)",
    async (_, insertStaleRow, counts) => {
      await seed();
      await insertStaleRow();
      const ticketsBefore = await idsIn(Tables.Ticket);
      const holdsBefore = await idsIn(Tables.SeatHold);

      await expect(
        new Migration1791923900000().up(queryRunner),
      ).rejects.toThrow(
        `Non-demo rows reference seats off their event's seat map: ${counts}`,
      );
      expect(await idsIn(Tables.Ticket)).toEqual(ticketsBefore);
      expect(await idsIn(Tables.SeatHold)).toEqual(holdsBefore);
      expect(ticketsBefore).toContain(unmappedDemoTicket.id);
      expect(holdsBefore).toContain(unmappedDemoHold.id);
    },
  );
});
