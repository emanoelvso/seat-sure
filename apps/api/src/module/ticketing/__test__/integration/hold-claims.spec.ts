import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Tables } from '@testInfra/enum/table.enum';
import { testDbClient } from '@testInfra/knex.database';
import { seatHoldFactory } from '@ticketingModule/__test__/factory/seat-hold.factory';
import { ticketFactory } from '@ticketingModule/__test__/factory/ticket.factory';
import { TicketStatus } from '@ticketingModule/core/enum/ticket-status.enum';
import { SeatHoldRepository } from '@ticketingModule/persistence/repository/seat-hold.repository';
import { TicketRepository } from '@ticketingModule/persistence/repository/ticket.repository';
import { TicketingPersistenceModule } from '@ticketingModule/persistence/ticketing-persistence.module';
import { DataSource } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';

// A fixed clock far from the database's own: every comparison must use the
// `now` passed in, never Postgres now() (AD-025).
const NOW = new Date('2031-03-15T12:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);

describe('Seat hold claims and live tickets (integration)', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let seatHolds: SeatHoldRepository;
  let tickets: TicketRepository;

  const eventId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();

  const deleteRows = async () => {
    await testDbClient(Tables.SeatHold).del();
    await testDbClient(Tables.Ticket).del();
  };

  // Every row of the seat, soft-deleted ones included
  const holdRowsFor = (seatId: string) =>
    testDbClient(Tables.SeatHold).where({ eventId, seatId });

  beforeAll(async () => {
    initializeTransactionalContext();
    module = await Test.createTestingModule({
      imports: [TicketingPersistenceModule],
    }).compile();
    dataSource = module.get<DataSource>(getDataSourceToken('ticketing'));
    seatHolds = module.get(SeatHoldRepository);
    tickets = module.get(TicketRepository);
  });

  beforeEach(async () => {
    await deleteRows();
  });

  afterAll(async () => {
    await deleteRows();
    await testDbClient.destroy();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('claims a free seat, returning the hold id and storing expiresAt (PAY-09)', async () => {
    const seatId = randomUUID();
    const expiresAt = at(10 * 60_000);

    const holdId = await dataSource.transaction((manager) =>
      seatHolds.claim(manager, {
        eventId,
        seatId,
        userId,
        expiresAt,
        now: NOW,
      }),
    );

    const rows = await holdRowsFor(seatId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: holdId, userId, deletedAt: null });
    expect(rows[0].expiresAt).toEqual(expiresAt);
  });

  it("returns null and leaves the row unchanged for another user's hold that expires 1 s after now (PAY-09)", async () => {
    const hold = seatHoldFactory.build({
      eventId,
      userId: otherUserId,
      expiresAt: at(1_000),
    });
    await testDbClient.batchInsert(Tables.SeatHold, [hold]);

    const holdId = await dataSource.transaction((manager) =>
      seatHolds.claim(manager, {
        eventId,
        seatId: hold.seatId,
        userId,
        expiresAt: at(10 * 60_000),
        now: NOW,
      }),
    );

    expect(holdId).toBeNull();
    const rows = await holdRowsFor(hold.seatId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: hold.id, userId: otherUserId });
    expect(rows[0].expiresAt).toEqual(hold.expiresAt);
  });

  it('reclaims a hold that expired 1 s before now for the new user and expiresAt (PAY-10)', async () => {
    const hold = seatHoldFactory.build({
      eventId,
      userId: otherUserId,
      expiresAt: at(-1_000),
    });
    await testDbClient.batchInsert(Tables.SeatHold, [hold]);
    const expiresAt = at(10 * 60_000);

    const holdId = await dataSource.transaction((manager) =>
      seatHolds.claim(manager, {
        eventId,
        seatId: hold.seatId,
        userId,
        expiresAt,
        now: NOW,
      }),
    );

    expect(holdId).toBe(hold.id);
    const rows = await holdRowsFor(hold.seatId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: hold.id, userId });
    expect(rows[0].expiresAt).toEqual(expiresAt);
  });

  it('leaves no row when the transaction throws after a claim (AD-023)', async () => {
    const seatId = randomUUID();
    let claimedId: string | null = null;

    await expect(
      dataSource.transaction(async (manager) => {
        claimedId = await seatHolds.claim(manager, {
          eventId,
          seatId,
          userId,
          expiresAt: at(10 * 60_000),
          now: NOW,
        });
        throw new Error('fail after the claim');
      }),
    ).rejects.toThrow('fail after the claim');

    expect(claimedId).not.toBeNull();
    expect(await holdRowsFor(seatId)).toHaveLength(0);
  });

  it("locks and then hard-deletes the user's holds on the given seats, leaving no soft-deleted row", async () => {
    const [first, second, notRequested] = seatHoldFactory.buildList(3, {
      eventId,
      userId,
      expiresAt: at(10 * 60_000),
    });
    const otherUsersHold = seatHoldFactory.build({
      eventId,
      userId: otherUserId,
      expiresAt: at(10 * 60_000),
    });
    await testDbClient.batchInsert(Tables.SeatHold, [
      first,
      second,
      notRequested,
      otherUsersHold,
    ]);

    const locked = await dataSource.transaction(async (manager) => {
      const rows = await seatHolds.lockForSeats(manager, eventId, [
        first.seatId,
        second.seatId,
      ]);
      await seatHolds.deleteForSeats(manager, eventId, userId, [
        first.seatId,
        second.seatId,
        otherUsersHold.seatId,
      ]);
      return rows;
    });

    expect(locked.map((hold) => hold.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(await holdRowsFor(first.seatId)).toHaveLength(0);
    expect(await holdRowsFor(second.seatId)).toHaveLength(0);
    const remaining = await testDbClient(Tables.SeatHold)
      .where({ eventId })
      .select('id');
    expect(remaining.map((row) => row.id).sort()).toEqual(
      [notRequested.id, otherUsersHold.id].sort(),
    );
  });

  it('finds live seats among issued and transferred tickets, skipping cancelled ones and other events', async () => {
    const issued = ticketFactory.build({
      eventId,
      status: TicketStatus.ISSUED,
    });
    const transferred = ticketFactory.build({
      eventId,
      status: TicketStatus.TRANSFERRED,
    });
    const cancelled = ticketFactory.build({
      eventId,
      status: TicketStatus.CANCELLED,
    });
    const otherEvent = ticketFactory.build({ status: TicketStatus.ISSUED });
    const notRequested = ticketFactory.build({
      eventId,
      status: TicketStatus.ISSUED,
    });
    await testDbClient.batchInsert(Tables.Ticket, [
      issued,
      transferred,
      cancelled,
      otherEvent,
      notRequested,
    ]);

    const seatIds = await dataSource.transaction((manager) =>
      tickets.findLiveSeatIds(manager, eventId, [
        issued.seatId!,
        transferred.seatId!,
        cancelled.seatId!,
        otherEvent.seatId!,
      ]),
    );

    expect([...seatIds].sort()).toEqual(
      [issued.seatId!, transferred.seatId!].sort(),
    );
  });
});
