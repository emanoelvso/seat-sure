# ADR-007: TypeORM with Repository Encapsulation and Per-Module Migrations

- **Date**: 2026-09-28 (recorded; in effect since 2026-08-31)
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, database, orm, typeorm, migrations
- **Links**:
  - [ADR-002: PostgreSQL and Redis as Database Stack](./002-postgresql-and-redis-as-database-stack.md)
  - [ADR-005: NestJS as the Backend Framework](./005-nestjs-as-backend-framework.md) (left "Prisma or TypeORM" open)
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)

## Context

ADR-005 named "Prisma or TypeORM" for PostgreSQL access without choosing one. The modular monolith (ADR-006) adds hard requirements on the data layer:
- Each module needs its own named connection, entity set, migration history and migrations table.
- Writes need transactions scoped to a single module's connection.
- The ORM must not leak into services or resolvers, so a module can later swap its storage.

The rest of the backend is decorator-driven (NestJS DI and code-first GraphQL), so entity definitions in the same style keep one idiom across layers.

## Decision

We will use **TypeORM** through `@nestjs/typeorm`:

- **Named DataSources**: each module registers a named DataSource (`TypeOrmPersistenceModule.forRoot({ name: '<module>' })`), limited to its own `entity/` and `migration/` globs, with `synchronize: false`.
- **Base entity**: entities extend `DefaultEntity`. It gives application-generated UUID v4 primary keys, `createdAt`/`updatedAt`, and soft delete through `deletedAt`.
- **Repository encapsulation**: repositories extend `DefaultTypeOrmRepository`. They are the only place where TypeORM APIs (`find`, `createQueryBuilder`, raw SQL) appear, and they return entities or plain data to services.
- **Migrations**: schema migrations are generated from entities per module (`pnpm --filter api <module>:db:generate`), reviewed, committed, and applied with `<module>:db:migrate`.
- **Transactions**: writes use `typeorm-transactional` with `@Transactional({ connectionName: '<module>' })`.

We chose it over Prisma for two reasons. First, Prisma centers on one schema and one generated client per database, so giving each module its own client, migration history and migrations table would mean running several Prisma setups side by side. Second, TypeORM's decorators match the NestJS and GraphQL code-first style already in use.

## Consequences

### Benefits

- Named DataSources map 1:1 to modules, which makes the state-isolation rules of ADR-006 concrete.
- Generated migrations keep entity classes and the schema in parity. Hand-writing FK or unique-constraint names is error-prone.
- Services depend on repository methods, not on the ORM, so a module can change its persistence without touching business logic.

### Challenges

- Query-builder strings and raw SQL (`'event.startAt >= :now'`, `"EventArtist"`) are not type-checked, so typos surface only at runtime. The e2e tests against a real database are the safety net (ADR-010).
- Every generated migration must be reviewed for unrelated diffs, which appear when the dev database is behind the migrations.
- `typeorm-transactional` needs each DataSource registered with `addTransactionalDataSource`. Catalog doesn't do this yet (tracked in `todo.md`).
- Current `Event` timestamps are `timestamp without time zone` holding Node-local wall time, so queries must pass `now` from the application instead of SQL `NOW()`.

### Trade-offs

- Prisma would give stronger compile-time typing of queries and results, at the cost of fighting its single-schema model for per-module isolation.
- A query builder without an ORM (e.g. Knex, already used by the e2e harness for seeding) would avoid ORM magic, but it would need hand-written migrations and entity mapping in every module.
