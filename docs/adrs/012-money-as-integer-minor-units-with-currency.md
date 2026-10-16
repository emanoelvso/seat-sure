# ADR-012: Money as Integer Minor Units with an ISO 4217 Currency

- **Date**: 2026-09-27
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, database, graphql, money
- **Links**:
  - [ADR-003: Single Events Table with JSONB Metadata](./003-single-events-table-with-jsonb-metadata.md) (sketches `price_from NUMERIC(10,2)`)
  - [ADR-011: Catalog Owns Ticket Types and Seat Maps](./011-catalog-owns-ticket-types-and-seat-maps.md)

## Context

`Event.price` is a `float` column. It shows a "from" price on event cards. Ticket types (ADR-011) add real per-section prices. These prices get compared in filters, will be multiplied by quantities, and will be summed into order totals and refunds. Binary floats can't represent most decimal amounts exactly, so totals drift by a cent. PostgreSQL `NUMERIC` is exact, but `node-postgres` returns it as a string, so every read would need a conversion. The platform will also need more than one currency once events outside the US are sold.

## Decision

New money fields are stored as **integer minor units** plus a **currency code**:

- **Column**: `integer`, named `<name>Cents` (e.g. `priceCents`), with a `CHECK` constraint when negative values are invalid.
- **Currency**: a `char(3)` ISO 4217 `currency` column on the same row, default `USD`.
- **GraphQL**: `Int` for the amount and `String` for the currency.
- **Formatting**: clients format money with `Intl.NumberFormat` (web: `formatPrice(cents, currency)`). The API never sends formatted strings.

`Event.price` stays a `float` for now. Deriving it from the lowest ticket-type price, or migrating it to cents, is a follow-up tracked in #44.

## Consequences

### Benefits

- Arithmetic and comparisons are exact integer operations in SQL, TypeScript and GraphQL.
- The currency travels with the amount, so multi-currency support needs no schema change.
- Amounts arrive in JavaScript as numbers, with no string parsing.

### Challenges

- GraphQL `Int` is 32-bit signed, which caps a single field at 2,147,483,647 minor units ($21,474,836.47). That's enough for ticket prices, but large order totals or aggregates may need a `Float`, a string scalar or a `BigInt` scalar.
- The `Cents` suffix assumes two decimal places. For zero-decimal currencies (e.g. JPY) the value is the whole amount, so formatting must use each currency's minor-unit exponent.
- There are two price representations until `Event.price` is migrated.

### Trade-offs

- `NUMERIC(10,2)` is exact and readable in SQL, but it comes back as a string in Node and needs a decimal library for safe arithmetic.
- Keeping `float` is the least work and wrong by construction for money.
