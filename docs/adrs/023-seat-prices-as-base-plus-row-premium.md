# ADR-023: Seat Prices as a Base Price Plus a Row Premium

- **Date**: 2026-10-13
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, frontend, catalog, ticketing, pricing
- **Links**:
  - [ADR-011: Catalog Owns Ticket Types and Seat Maps Until Ticketing Has Behavior](./011-catalog-owns-ticket-types-and-seat-maps.md)
  - Feature spec: `.specs/features/seat-page-design-parity/` (decision AD-029 in `.specs/STATE.md`)

## Context

The seat page has a price-range filter, a Perks filter and a view rating card. Until now every seat in a section shared one ticket type, so all seats had the same price and the same attributes, and the filters could not tell seats apart. Seats belong to the venue's seat map, while prices belong to the event's ticket type. A row price must never fall below the ticket type's base price, because the listing page shows the base price as the cheapest ("From") price.

## Decision

- A seat's price is its ticket type's `priceCents` (the base) plus its row's premium. The premium is an integer number of cents, at least 0, stored per (`ticketTypeId`, `row`) on the event-scoped ticket type. A row with no entry costs the base price. Persistence rejects a negative or non-integer premium.
- Physical seat facts live on the venue's seat map: perks (`AISLE`, `EXTRA_LEGROOM`, `ACCESSIBLE`) on the seat, and the view rating (score 0.0 to 5.0 and a short label) per section.
- Catalog resolves each seat's price in `findTicketTypeSeats` and exposes each ticket type's highest seat price as `maxPriceCents`. Checkout reads the seat prices from Catalog, stores each order item's `unitPriceCents` as its seat's current row price, and computes `subtotalCents` as their sum.
- Fees and tax stay per ticket type; only the base ticket price varies by row.

## Consequences

### Benefits

- "From" is always the cheapest price by construction, so the listing page needs one number, `maxPriceCents`, to know whether to show it.
- The seat page and checkout price a seat from one source, so the order charges what the review dialog showed. Orders snapshot the price, so later premium changes never touch them.
- Perks and ratings follow the venue, so every event at that venue shares them.

### Challenges

- `CheckoutOrderModel.unitPriceCents` is the first item's price when rows differ. The checkout order summary shows the ticket subtotal in that case; any other consumer must not multiply it by the quantity.
- Seats and their prices are now read from two places (venue seat map and event row premiums) and joined in Catalog's service layer.
- There is no admin input for premiums, perks or ratings yet; demo data is seeded by migration.

### Trade-offs

- Storing a premium instead of an absolute row price makes "no row below the base" a plain check constraint, but changing a base price moves every row price with it.
- The listing page price filter keeps matching the base price, so a fan filtering by a maximum may miss a section whose cheap rows fit but whose "From" price is the base.
