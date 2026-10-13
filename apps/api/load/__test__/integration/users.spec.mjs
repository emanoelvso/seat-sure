import pg from 'pg';
import { startApi } from '../../lib/api-process.mjs';
import { graphql } from '../../lib/graphql.mjs';
import { seedEvent } from '../../lib/seed.mjs';
import { createBuyerSessions } from '../../lib/users.mjs';

const START_CHECKOUT = `mutation ($input: StartCheckoutInput!) {
  startCheckout(input: $input) { id status quantity }
}`;

describe('createBuyerSessions', () => {
  let api;
  let seeded;
  let sessions;
  const db = () => new pg.Client({ connectionString: api.databaseUrl });

  beforeAll(async () => {
    api = await startApi();
    seeded = await seedEvent({ databaseUrl: api.databaseUrl });
    sessions = await createBuyerSessions({
      baseUrl: api.baseUrl,
      databaseUrl: api.databaseUrl,
      count: 5,
    });
  });

  afterAll(async () => {
    const client = db();
    await client.connect();
    const { rows } = await client.query(
      'SELECT "seatMapId", "venueId" FROM "CatalogEvent" WHERE id = $1',
      [seeded.eventId],
    );
    const emails = sessions.map((session) => session.email);
    const users = `(SELECT id FROM "IdentityUser" WHERE email = ANY($1))`;
    await client.query(`DELETE FROM "TicketingSeatHold" WHERE "eventId" = $1`, [
      seeded.eventId,
    ]);
    await client.query(
      `DELETE FROM "TicketingOrderItem" WHERE "orderId" IN (SELECT id FROM "TicketingOrder" WHERE "eventId" = $1)`,
      [seeded.eventId],
    );
    await client.query(`DELETE FROM "TicketingOrder" WHERE "eventId" = $1`, [
      seeded.eventId,
    ]);
    await client.query(
      `DELETE FROM "IdentitySession" WHERE "userId" IN ${users}`,
      [emails],
    );
    await client.query(
      `DELETE FROM "IdentityVerificationCode" WHERE "userId" IN ${users}`,
      [emails],
    );
    await client
      .query(`DELETE FROM "NotificationsNotification"`)
      .catch(() => {});
    await client.query(`DELETE FROM "UserProfileUser" WHERE id IN ${users}`, [
      emails,
    ]);
    await client.query(`DELETE FROM "IdentityUser" WHERE email = ANY($1)`, [
      emails,
    ]);
    await client.query('DELETE FROM "CatalogTicketType" WHERE id = $1', [
      seeded.ticketTypeId,
    ]);
    await client.query('DELETE FROM "CatalogEvent" WHERE id = $1', [
      seeded.eventId,
    ]);
    await client.query('DELETE FROM "CatalogSeat" WHERE "seatMapId" = $1', [
      rows[0].seatMapId,
    ]);
    await client.query('DELETE FROM "CatalogSeatMap" WHERE id = $1', [
      rows[0].seatMapId,
    ]);
    await client.query('DELETE FROM "CatalogVenue" WHERE id = $1', [
      rows[0].venueId,
    ]);
    await client.end();
    await api.stop();
  });

  it('creates 5 buyers, each with a distinct session', () => {
    expect(sessions).toHaveLength(5);
    expect(new Set(sessions.map((session) => session.email)).size).toBe(5);
    expect(new Set(sessions.map((session) => session.accessToken)).size).toBe(
      5,
    );
  });

  it('every session is accepted by AuthGuard on startCheckout', async () => {
    for (const [index, session] of sessions.entries()) {
      const result = await graphql(
        api.baseUrl,
        START_CHECKOUT,
        {
          input: {
            eventId: seeded.eventId,
            ticketTypeId: seeded.ticketTypeId,
            seatIds: [seeded.seatIds[index]],
          },
        },
        session.accessToken,
      );
      expect(result.errors).toBeUndefined();
      expect(result.data.startCheckout.status).toBe('PENDING');
      expect(result.data.startCheckout.quantity).toBe(1);
    }
  });
});
