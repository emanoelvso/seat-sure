# ADR-015: Seat Holds Owned Entirely by Ticketing

- **Date**: 2026-09-29
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, bounded-contexts, ticketing, concurrency
- **Links**:
  - [ADR-002: PostgreSQL and Redis as Database Stack](./002-postgresql-and-redis-as-database-stack.md) (superseded in part: its `SELECT ... FOR UPDATE` seat reservation)
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-011: Catalog Owns Ticket Types and Seat Maps](./011-catalog-owns-ticket-types-and-seat-maps.md)
  - Decision AD-011 in `.specs/STATE.md`

## Context

ADR-002 assumed seat reservation would run as a `SELECT ... FOR UPDATE` lock spanning seats and orders in one transaction, with Redis TTLs as a secondary hold mechanism. ADR-006 then split the schema into modules with no shared transactions and no foreign keys across them: seats belong to Catalog, and orders and tickets belong to Ticketing. A `SELECT ... FOR UPDATE` that locks a Catalog seat row and inserts a Ticketing order row can no longer run in one transaction, so ADR-002's mechanism cannot be implemented as written. Seat locking still needs to guarantee that two buyers can never hold or buy the same seat for the same event, and that an abandoned hold releases the seat automatically.

## Decision

Seat locking lives entirely inside Ticketing. Catalog seats are referenced by plain `seatId`, with no lock or transaction that spans Catalog.

- **The lock**: `TicketingSeatHold`, unique on (`eventId`, `seatId`). The unique constraint is the lock, not a row-level `SELECT ... FOR UPDATE`.
- **Claiming a seat**: one statement,
  ```sql
  INSERT INTO "TicketingSeatHold" ("eventId", "seatId", "userId", "expiresAt")
  VALUES ($1, $2, $3, now() + interval '10 minutes')
  ON CONFLICT ("eventId", "seatId") DO UPDATE
    SET "userId" = EXCLUDED."userId", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "TicketingSeatHold"."expiresAt" < now()
  ```
  run inside one Ticketing transaction (`@Transactional({ connectionName: 'ticketing' })`). The claim succeeds only if a row comes back: either the insert created a new hold, or the update reclaimed one whose `expiresAt` had already passed. A seat held by someone else, not yet expired, matches neither branch and returns no row, so the caller sees a plain "not available."
- **Multi-seat claims**: every seat in the request is claimed with this statement inside the same transaction. If any seat returns no row, the transaction rolls back, so a claim is all-or-nothing.
- **Selling**: converting a hold into a sale reads Ticketing's own holds and writes `TicketingTicket` in the same Ticketing transaction. `TicketingTicket` is unique on (`eventId`, `seatId`), so even if a hold were ever claimed twice, the final insert of a ticket is the last guard against double-selling.
- **Catalog stays uninvolved**: the seat list for a seat map comes from Catalog's public API provider, read once when the checkout screen loads. No Ticketing query joins, locks, or opens a transaction against a Catalog table.
- **Redis**: an optional read cache for availability lookups, never the lock. Correctness never depends on it being present or consistent.

## Consequences

### Benefits

- Seat locking fits inside ADR-006's state-isolation rule: one module, one connection, one transaction, no cross-context FK.
- The `ON CONFLICT ... DO UPDATE ... WHERE expiresAt < now()` statement makes claim-or-reclaim atomic without an explicit row lock or a cleanup job racing the claim.
- `TicketingTicket`'s unique constraint gives the same double-sale guarantee ADR-002 wanted from `SELECT ... FOR UPDATE`, now enforced entirely within Ticketing.

### Challenges

- Expired holds are never deleted, only overwritten on the next claim attempt for that exact seat. A seat that nobody retries keeps a stale row until then; a periodic cleanup job is optional, not required for correctness.
- Availability for a seat map is Catalog's seats minus Ticketing's holds and tickets, a cross-module read that Catalog cannot answer by itself. The client (or a Ticketing read model) combines both.
- ADR-011's `TicketType.seatsAvailable` still lives in Catalog and is not updated by this flow. It stays an approximate, eventually-consistent count until Ticketing sells, as ADR-011 already accepts.

### Trade-offs

- A Redis `SET NX` hold would avoid a Postgres write per claim attempt and gets TTL expiry for free, but moves the correctness guarantee into a system with no ACID transaction connecting it to the eventual `TicketingTicket` insert, reopening the double-sale risk ADR-002 was written to close.
- A Ticketing-owned seat-inventory table (one row per seat, an `available | held | sold` enum) would make availability a single-module read, but it duplicates Catalog's seat list and needs a sync mechanism to stay correct when Catalog adds or removes seats. The unique-constraint hold needs no such duplication: it only exists for seats someone has actually tried to hold.
