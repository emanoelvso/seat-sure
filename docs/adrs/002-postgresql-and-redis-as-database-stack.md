# ADR-002: PostgreSQL and Redis as the Database Stack

- **Date**: 2026-09-10
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, database, postgresql, redis, caching

## Context

A ticketing platform has a hard correctness requirement: the same seat cannot be sold to two different users. This is a classic concurrent write problem that requires ACID transactions and row-level locking to solve reliably. Additionally, seat availability data is read far more frequently than it changes, so serving it from a database on every request is wasteful. The platform also needs a mechanism to temporarily hold seats during checkout (e.g., "reserved for 10 minutes while user completes payment") without permanently blocking inventory if the user abandons the flow.

## Decision

We will use **PostgreSQL** as the primary database for all persistent business data (events, venues, seats, orders, users, reviews, FAQs). Seat reservation during purchase will use a `SELECT ... FOR UPDATE` lock within a transaction to prevent concurrent sales of the same seat.

We will use **Redis** as a secondary layer for:

- **Seat availability cache** — reduce read load on PostgreSQL for high-traffic event pages
- **Temporary seat holds** — a seat claimed during checkout is held in Redis with a TTL (e.g., 10 minutes); if the order is not completed, the TTL expires and the seat becomes available again automatically
- **Session and auth token storage** — fast key-value lookup for JWT session data
- **Rate limiting** — prevent ticket bot abuse using Redis counters with TTL

MongoDB or any document database was not considered because the data is structured, relational, and requires transactional integrity — exactly the use case relational databases are designed for.

## Consequences

### Benefits

- ACID transactions in PostgreSQL guarantee that seat double-selling is impossible at the database level
- Redis TTL-based seat holds are a natural fit for the "hold seat during checkout" pattern — no cleanup job needed; expiry is automatic
- PostgreSQL's JSONB support covers type-specific event metadata without requiring a separate NoSQL database
- Both PostgreSQL and Redis are industry-standard, well-understood, and supported by all major cloud providers (AWS RDS / ElastiCache, GCP Cloud SQL / Memorystore)

### Challenges

- Operating two database systems increases infrastructure complexity compared to a single database
- Cache invalidation between Redis and PostgreSQL must be handled carefully — stale seat availability data could lead to poor user experience (showing a seat as available when it is sold)
- Redis is in-memory; a restart without persistence configured will lose cached data, requiring a cache warm-up strategy

### Trade-offs

- Using PostgreSQL alone (without Redis) would simplify the stack but would not handle the seat hold pattern cleanly — PostgreSQL row locks are not TTL-based and would require a background cleanup job
- Using a managed NoSQL database (e.g., DynamoDB) would reduce operational burden but would make the seat reservation correctness problem significantly harder to solve without application-level conflict resolution
