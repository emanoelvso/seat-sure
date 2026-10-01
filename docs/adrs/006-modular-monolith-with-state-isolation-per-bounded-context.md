# ADR-006: Modular Monolith with State Isolation per Bounded Context

- **Date**: 2026-09-27
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, modular-monolith, ddd, bounded-contexts
- **Links**:
  - [ADR-002: PostgreSQL and Redis as Database Stack](./002-postgresql-and-redis-as-database-stack.md)
  - [ADR-005: NestJS as the Backend Framework](./005-nestjs-as-backend-framework.md)
  - [`apps/api/docs/modular-architecture-principles.md`](../../apps/api/docs/modular-architecture-principles.md)
  - [`apps/api/docs/architecture-guidelines.md`](../../apps/api/docs/architecture-guidelines.md)
  - [`docs/architecture/bounded-contexts.md`](../architecture/bounded-contexts.md)

## Context

Seat Sure has seven bounded contexts: Identity & Access, User Profile, Catalog, Ticketing, Billing, Social Proof and Notifications. They have very different load profiles. Catalog is read-heavy, and Ticketing spikes during on-sales. One developer builds the product, so running seven services from day one would cost more in operations than it returns. A single NestJS app with no internal rules would couple the contexts through shared tables and joins. That would make it impossible to extract Ticketing later without a rewrite. All contexts share one PostgreSQL instance (ADR-002).

## Decision

We will build the API as a **modular monolith**: one NestJS application and one deployment, with one module per bounded context under `src/module/{context}/`. The boundaries are enforced by convention, lint and review, not by separate deployments:

- **Boundaries**: a module exports only its public API provider. Contracts live in `src/module/shared/module/integration/`.
- **Communication**: synchronous calls go through public API providers. Asynchronous reactions go through BullMQ jobs, published after the producing transaction commits.
- **State isolation**: each module has its own named DataSource, entities, migrations and migrations table (`{module}_migrations`). There are no foreign keys, TypeORM relations, joins or repository access across modules. Other modules' records are referenced by plain `uuid` columns, and the needed fields are replicated.
- **Table naming**: table names are prefixed with the module, e.g. `CatalogEvent` or `TicketingOrder`.
- **Layers inside a module**: `core/`, `http/`, `persistence/`, `queue/`, `integration/`. Folder and file names are enforced by `eslint-plugin-project-structure` (`.projectStructurerc.json`).
- **Tests**: each module's e2e tests boot only that module.

The full rules are in `apps/api/docs/`.

## Consequences

### Benefits

- Extracting a module into its own service stays a refactor: swap the public API provider for an HTTP client and point the DataSource at a new database.
- Every table has exactly one owner, so migrations never conflict across contexts.
- Modules can be developed and tested in isolation. A failing Billing test can't break Catalog's e2e suite.

### Challenges

- A transaction can't span modules. Cross-context consistency, such as "payment succeeded → issue tickets", is eventual and needs idempotent consumers.
- ADR-002's seat reservation assumed `SELECT ... FOR UPDATE` across seats and orders. With seats in Catalog and holds in Ticketing, that needed a redesign, recorded in [ADR-015](./015-seat-holds-owned-by-ticketing.md).
- Replicated fields (e.g. `Order.eventName`) can drift from the source and need a refresh strategy.

### Trade-offs

- Microservices from the start would give physical isolation, but they multiply deployment, observability and local-dev cost for one developer, before any context needs independent scaling.
- A classic layered monolith (global `resolvers/`, `services/`, `repositories/`) is faster to start, but it couples every context through shared tables and makes later extraction a rewrite.
- One database per module would enforce isolation physically, but it adds operational cost now. Separate DataSources on one instance keep that option open.
