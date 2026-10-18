# ADR-014: Not-Found as Null Results in GraphQL Lookup Queries

- **Date**: 2026-09-27
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, graphql, error-handling
- **Links**:
  - [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md)

## Context

`findArtistBySlug` used to return `null` for a non-null `FindArtist` type, so an unknown slug surfaced as a GraphQL error. The client then couldn't tell "this artist doesn't exist" from "the API failed", and showed the same retry screen for both. `findEventTickets` receives an id straight from the URL. Passing a malformed id to a `uuid` column makes Postgres throw a cast error, which would also leak as a GraphQL error. Pages need three distinct outcomes: loaded, not found (with a way out), and failed (with retry).

## Decision

Lookup queries return a **non-null wrapper type whose entity fields are nullable and whose lists are empty** when nothing matches:

- `FindArtist { artist: Artist, eventsByCity: [...], nearbyEvents: [...], featuredFestival: Event }`
- `EventTickets { event: Event, seatMap: SeatMap, ticketTypes: [TicketType!]! }`
- These cases return `null` / `[]` with **no `errors`**: an unknown identifier, an existing but unavailable record (unpublished or past event), and a structurally valid string that isn't a well-formed id.
- Id inputs are validated as strings (`@IsString`), not `@IsUUID`. The service checks the format (`isUUID`) before any SQL.
- GraphQL `errors` are reserved for failures: schema violations (missing or mistyped arguments) and server errors.

On the web: `error` shows an alert with "Try again", and a `null` entity shows a "not found" page linking to `/events`.

## Consequences

### Benefits

- Clients get an unambiguous split between "not found" and "failed", and each state has its own UI and tests.
- Database errors never reach clients for bad input.
- Apollo caches the `null` result like any other response.

### Challenges

- Every client must null-check the entity field before using the rest of the payload.
- "Doesn't exist" and "not available" (e.g. a draft event) look the same to clients. This is deliberate, so drafts aren't leaked, but it hides the reason.
- Malformed ids fail silently as `null`, which is harder to debug than an explicit validation error.
- Future lookup queries must follow the same shape, or the convention erodes.

### Trade-offs

- An `extensions.code = "NOT_FOUND"` error is common in Apollo APIs, but it puts not-found in the same channel as real failures and forces clients to inspect error codes.
- A result union (`EventTicketsResult = EventTickets | NotFound | Unavailable`) is more expressive and can carry the reason, but it adds schema types and `__typename` handling to every client.
