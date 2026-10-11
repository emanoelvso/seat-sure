# C4 Level 2: Containers

The deployable pieces of Seat Sure and how they talk. Elements tagged `planned` have no code or config in the repo yet.

```mermaid
C4Container
  title Container Diagram: Seat Sure

  Person(buyer, "Ticket buyer", "Browses events, picks seats, pays")

  System_Boundary(seatSure, "Seat Sure") {
    Container(web, "Web app", "Next.js 16, React", "Server-rendered pages and client components (apps/web)")
    Container(api, "API", "NestJS modular monolith", "GraphQL API; one module per bounded context (apps/api)")
    ContainerDb(db, "PostgreSQL 15", "PostgreSQL", "Business data, sessions, seat holds; each module owns its own tables")
    ContainerDb(redis, "Redis (planned)", "Redis 7", "Cache per ADR-002. Configured but unused by the code today", $tags="planned")
  }

  Rel(buyer, web, "Uses")
  Rel(web, api, "Queries and mutates", "GraphQL over HTTP (/graphql)")
  Rel(api, db, "Reads and writes", "PostgreSQL protocol via TypeORM")
  Rel(api, redis, "Caches (planned)", "Redis protocol", $tags="planned")

  UpdateElementStyle(redis, $bgColor="grey", $borderColor="grey")
  UpdateRelStyle(api, redis, $textColor="grey", $lineColor="grey")
```

## Sources

- Web calls `${apiUrl}/graphql` (`apps/web/src/lib/graphql-server.ts`, `apps/web/src/lib/apollo-client.ts`). GraphQL is the primary API: [ADR-001](../../adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md).
- The API is a NestJS modular monolith: [ADR-005](../../adrs/005-nestjs-as-backend-framework.md), [ADR-006](../../adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md).
- Each module builds a TypeORM data source with `type: 'postgres'` (`apps/api/src/module/*/persistence/typeorm-datasource.factory.ts`). The image is `postgres:15-alpine` (`apps/api/docker-compose.yml`).
- Redis is `planned`: the compose service is commented out, the config schema only reads `REDIS_HOST` and `REDIS_PORT` (`apps/api/src/module/shared/module/config/util/config.schema.ts`), and no source file creates a Redis client (`bullmq` is listed in `apps/api/package.json` but nothing under `apps/api/src` imports it). [ADR-002](../../adrs/002-postgresql-and-redis-as-database-stack.md) describes the intended use, and sessions and seat holds ended up in PostgreSQL instead.
- Previous level: [context diagram](./context.md). Next level: [component diagram](./component.md).
