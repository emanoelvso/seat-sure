# ADR-011: Catalog Owns Ticket Types and Seat Maps Until Ticketing Has Behavior

- **Date**: 2026-09-27
- **Status**: Accepted, amended 2026-10-13 (seat maps belong to their venue)
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, bounded-contexts, catalog, ticketing
- **Links**:
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [`docs/architecture/bounded-contexts.md`](../architecture/bounded-contexts.md)
  - Feature spec: `.specs/features/buy-ticket-choose-section/` (decision AD-001 in `.specs/STATE.md`)

## Context

The buy-ticket "choose section" screen needs, for one event, the venue seat map and a price, seats available and max per order for each section. `bounded-contexts.md` puts seat maps in Catalog and seat reservation, orders and tickets in Ticketing. `entities.mmd` places `TICKET_TYPE` under the event without assigning it to a context. No Ticketing module exists yet, and the screen is read-only: nothing is reserved when a section is picked. ADR-006 forbids foreign keys and joins across modules, so the owning module has to be settled before the first table is created.

## Decision

**Catalog** owns ticket types and seat maps:
- `TicketType` has one row per event section, with `sectionKey`, `name`, `priceCents`, `currency`, `seatsAvailable`, `maxPerOrder` and `tags`. It has a foreign key to `Event` (`ON DELETE CASCADE`) and is unique on (`eventId`, `sectionKey`).
- `Event.seatMapId` references `SeatMap` (`ON DELETE SET NULL`). Superseded: see the 2026-10-13 amendment.
- Catalog serves the event, seat map and ticket types in one query (`findEventTickets`).

When Ticketing is built, it will read ticket types through Catalog's public API provider. Its holds, orders and tickets will reference `ticketTypeId` by plain UUID, with no foreign key.

We did not create a Ticketing module now to own `TicketType`. That would need its own DataSource and a cross-module read for a page that only displays catalog data, all before Ticketing has any behavior.

## Consequences

### Benefits

- The choose-section screen is served by one module and one query, with referential integrity between events, ticket types and seat maps.
- Ticket types stay next to the event they describe, which matches how an admin will create them (with the event).

### Challenges

- `seatsAvailable` lives in Catalog while sales will happen in Ticketing. Decrementing it needs a cross-module flow, either a public API call or an event, and becomes eventually consistent.
- If Ticketing later needs to own inventory, the entity, its migration history and its data must move modules. That's a planned refactor, not a free one.

### Trade-offs

- Owning ticket types in Ticketing would match "Ticketing sells" more literally, and inventory and holds would share a transaction. The cost is a new module and cross-context reads today, for no current behavior.

## Amendment (2026-10-13): Seat Maps Belong to Their Venue

Issue #29. The two seeded seat maps had no venue, and every published concert or football match used one of them, whatever its venue. A seat map is one venue's layout, so:

- `CatalogSeatMap.venueId` is required, and (`id`, `venueId`) is unique.
- `CatalogEvent` references its map with a composite foreign key, (`seatMapId`, `venueId`) → `CatalogSeatMap` (`id`, `venueId`). The database rejects an event whose map belongs to another venue. An event without a map (`seatMapId` NULL) is not checked.
- The event→map foreign key is `ON DELETE RESTRICT`. `SET NULL` would also null the event's required `venueId`, so a map in use can't be hard-deleted.
- `createEvent` takes an optional `seatMapId`. An unknown map returns `Seat map not found`; a map of another venue returns 422 `SEAT_MAP_VENUE_MISMATCH` (ADR-018) before the database is reached.
- Seed data: Concentric Arena belongs to The Colosseum at Caesars Palace and Football Stadium to Maracanã. Events at other venues lost their map and show "Seat selection isn't available" until their venue gets its own layout. Ticketing dropped the demo tickets and holds left on those events.

`CatalogSeat` also rejects blank `row`, `number` and `sectionKey` and negative `x`/`y`.

### Consequences

- Every writer (the API, migrations, the load-test seed) gets the same guarantee, because the rule lives in the schema.
- Ten arena venues and one stadium venue have no seat map until layouts are authored for them.
- Deleting a seat map in use now requires unlinking its events first.
