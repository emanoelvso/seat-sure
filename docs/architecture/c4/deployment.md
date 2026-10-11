# C4 Deployment: Local Development

The local topology that the repo configures, from `apps/api/docker-compose.yml`. No hosted environment is configured in the repo, so none is drawn. Elements tagged `planned` have no active config yet.

```mermaid
C4Deployment
  title Deployment Diagram: Local Development

  Deployment_Node(dev, "Developer machine", "pnpm workspace") {
    Container(web, "Web app", "Next.js", "Started with the apps/web dev script (next dev); not part of the compose file")

    Deployment_Node(compose, "Docker Compose", "project seat-sure") {
      Deployment_Node(dbNode, "seat-sure-db", "postgres:15-alpine, port 5432, profiles all and deps") {
        ContainerDb(db, "PostgreSQL 15", "PostgreSQL", "Business data for all modules")
      }
      Deployment_Node(apiNode, "seat-sure-monolith", "Built from apps/api/Dockerfile, port 3000, profile all") {
        Container(api, "API", "NestJS modular monolith", "GraphQL API")
      }
      Deployment_Node(redisNode, "seat-sure-redis (planned)", "redis:7-alpine, port 6379, service commented out", $tags="planned") {
        ContainerDb(redis, "Redis (planned)", "Redis 7", "Not used by the code today", $tags="planned")
      }
    }
  }

  Rel(web, api, "Queries and mutates", "GraphQL over HTTP")
  Rel(api, db, "Reads and writes", "PostgreSQL protocol, port 5432")
  Rel(api, redis, "Caches (planned)", "Redis protocol, port 6379", $tags="planned")

  UpdateElementStyle(redis, $bgColor="grey", $borderColor="grey")
  UpdateRelStyle(api, redis, $textColor="grey", $lineColor="grey")
```

## Sources

- `apps/api/docker-compose.yml` defines the `db` service (`postgres:15-alpine`, `5432:5432`, profiles `all` and `deps`) and the `monolith` service (built from `apps/api/Dockerfile`, `3000:3000`, profile `all`, `depends_on` the database).
- The `redis` service (`redis:7-alpine`, `6379:6379`) is commented out in the compose file, so Redis is `planned`. The `monolith` service already sets `REDIS_HOST` and `REDIS_PORT`.
- With the `deps` profile only the database runs, and the API can then run on the host with `nest start --watch` (`apps/api/package.json`).
- The web app has no compose service. Its `dev` script is `next dev` (`apps/web/package.json`).
- Containers and modules: [container diagram](./container.md), [component diagram](./component.md).
