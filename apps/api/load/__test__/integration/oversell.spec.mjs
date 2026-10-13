import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { checkOversell } from '../../verify/oversell.mjs';

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/seat-sure-test';
const script = fileURLToPath(
  new URL('../../verify/oversell.mjs', import.meta.url),
);

// Constraint-free copies of the columns the check reads, in a throwaway
// schema, so a duplicate can be inserted (the real tables reject it).
const schema = `oversell_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const db = new pg.Client({ connectionString: databaseUrl });

const runCli = (eventId) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [script, eventId, schema],
      { env: { ...process.env, LOAD_DATABASE_URL: databaseUrl } },
      (error) => resolve(error ? error.code : 0),
    );
  });

const insertTicket = (eventId, seatId, status = 'issued') =>
  db.query(
    `INSERT INTO "${schema}"."TicketingTicket" ("eventId", "seatId", status) VALUES ($1, $2, $3)`,
    [eventId, seatId, status],
  );

// A paid order of one seat: order, item and succeeded payment.
const insertPaidOrder = async (eventId, seatId) => {
  const orderId = randomUUID();
  await db.query(
    `INSERT INTO "${schema}"."TicketingOrder" (id, "eventId") VALUES ($1, $2)`,
    [orderId, eventId],
  );
  await db.query(
    `INSERT INTO "${schema}"."TicketingOrderItem" ("orderId", "seatId") VALUES ($1, $2)`,
    [orderId, seatId],
  );
  await db.query(
    `INSERT INTO "${schema}"."BillingPayment" ("orderId", status) VALUES ($1, 'succeeded')`,
    [orderId],
  );
};

describe('checkOversell', () => {
  beforeAll(async () => {
    await db.connect();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(
      `CREATE TABLE "${schema}"."TicketingTicket" ("eventId" uuid, "seatId" uuid, status text)`,
    );
    await db.query(
      `CREATE TABLE "${schema}"."TicketingSeatHold" ("eventId" uuid, "seatId" uuid)`,
    );
    await db.query(
      `CREATE TABLE "${schema}"."TicketingOrder" (id uuid, "eventId" uuid)`,
    );
    await db.query(
      `CREATE TABLE "${schema}"."TicketingOrderItem" ("orderId" uuid, "seatId" uuid)`,
    );
    await db.query(
      `CREATE TABLE "${schema}"."BillingPayment" ("orderId" uuid, status text)`,
    );
  });

  afterAll(async () => {
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.end();
  });

  it('a clean event passes and exits 0', async () => {
    const eventId = randomUUID();
    for (const seatId of [randomUUID(), randomUUID()]) {
      await insertTicket(eventId, seatId);
      await insertPaidOrder(eventId, seatId);
    }

    const result = await checkOversell({ databaseUrl, eventId, schema });
    expect(result.ok).toBe(true);
    expect(result.soldTickets).toBe(2);
    expect(result.paidSeats).toBe(2);
    expect(await runCli(eventId)).toBe(0);
  });

  it('a duplicate ticket for one seat fails and exits 1', async () => {
    const eventId = randomUUID();
    const seatId = randomUUID();
    await insertTicket(eventId, seatId);
    await insertTicket(eventId, seatId);
    await insertPaidOrder(eventId, seatId);
    await insertPaidOrder(eventId, seatId);

    const result = await checkOversell({ databaseUrl, eventId, schema });
    expect(result.ok).toBe(false);
    expect(result.duplicateTickets).toHaveLength(1);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a duplicate hold for one seat fails', async () => {
    const eventId = randomUUID();
    const seatId = randomUUID();
    for (let i = 0; i < 2; i++) {
      await db.query(
        `INSERT INTO "${schema}"."TicketingSeatHold" ("eventId", "seatId") VALUES ($1, $2)`,
        [eventId, seatId],
      );
    }

    const result = await checkOversell({ databaseUrl, eventId, schema });
    expect(result.ok).toBe(false);
    expect(result.duplicateHolds).toHaveLength(1);
    expect(await runCli(eventId)).toBe(1);
  });

  it('sold tickets that differ from paid seats fail and exit 1', async () => {
    const eventId = randomUUID();
    await insertTicket(eventId, randomUUID());

    const result = await checkOversell({ databaseUrl, eventId, schema });
    expect(result.ok).toBe(false);
    expect(result.soldTickets).toBe(1);
    expect(result.paidSeats).toBe(0);
    expect(await runCli(eventId)).toBe(1);
  });

  it('a cancelled ticket beside an issued one for a seat is not a duplicate', async () => {
    const eventId = randomUUID();
    const seatId = randomUUID();
    await insertTicket(eventId, seatId, 'cancelled');
    await insertTicket(eventId, seatId, 'issued');
    await insertPaidOrder(eventId, seatId);

    expect((await checkOversell({ databaseUrl, eventId, schema })).ok).toBe(
      true,
    );
  });

  it('the real tables answer the check for an unknown event', async () => {
    const result = await checkOversell({ databaseUrl, eventId: randomUUID() });
    expect([result.ok, result.soldTickets, result.paidSeats]).toEqual([
      true,
      0,
      0,
    ]);
  });
});
