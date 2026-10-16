import { transaction, runCli } from './database.mjs';
import { seedCatalog, refreshEventDates, ids } from './seed.mjs';

// This is the whole disposable environment, never a shared/customer database.
// DELETE keeps rollback and trigger semantics; all per-context migrations remain.
export const reset = (env = process.env) => transaction(env, async (client) => {
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ~ '^(Identity|UserProfile|Billing|Ticketing|Notifications)' ORDER BY tablename`);
  // Dependent order for the existing per-context foreign keys.
  const ordered = ['TicketingTicket', 'TicketingOrderItem', 'TicketingSeatHold', 'TicketingOrder', 'IdentitySession', 'IdentityVerificationCode', 'IdentityPasswordResetGrant', 'IdentityLoginThrottle', 'IdentityUser', 'BillingPayment', 'BillingPaymentCard', 'BillingCardThrottle', 'NotificationsNotification', 'UserProfileUser'];
  const present = new Set(tables.rows.map(({ tablename }) => tablename));
  for (const table of ordered) if (present.has(table)) await client.query(`DELETE FROM "${table}"`);
  // Only the reserved sample namespace is rebuilt; the catalog the migrations create stays.
  await client.query('DELETE FROM "CatalogEvent" WHERE id = $1', [ids.event]);
  await client.query('DELETE FROM "CatalogSeatMapSectionView" WHERE "seatMapId" = $1', [ids.map]);
  await client.query('DELETE FROM "CatalogSeat" WHERE "seatMapId" = $1', [ids.map]);
  await client.query('DELETE FROM "CatalogSeatMap" WHERE id = $1', [ids.map]);
  await client.query('DELETE FROM "CatalogArtist" WHERE id = $1', [ids.artist]);
  await client.query('DELETE FROM "CatalogVenue" WHERE id = $1', [ids.venue]);
  await seedCatalog(client);
  await refreshEventDates(client);
});
runCli(import.meta.url, () => reset());
