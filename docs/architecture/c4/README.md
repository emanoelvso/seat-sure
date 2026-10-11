# C4 Documentation

Mermaid C4 diagrams of Seat Sure as built. Each file holds one diagram and tags anything without code or config backing as `planned`.

| Level | File | What it shows |
| ----- | ---- | ------------- |
| 1. Context | [context.md](./context.md) | The ticket buyer, Seat Sure, and the external payment gateway. |
| 2. Container | [container.md](./container.md) | The Next.js web app, the NestJS API, PostgreSQL, and Redis (planned), with the GraphQL and database links. |
| 3. Component | [component.md](./component.md) | The API's bounded-context modules, the shared kernel, and the module-to-module imports. |
| Deployment | [deployment.md](./deployment.md) | The local topology from `apps/api/docker-compose.yml`. |

## Related documents

- [ADR-006](../../adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md): why the API is a modular monolith.
- [ADR-002](../../adrs/002-postgresql-and-redis-as-database-stack.md): the PostgreSQL and Redis stack.
- [ADR-001](../../adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md): GraphQL as the primary API.
- [architecture.mmd](../architecture.mmd): the older microservices diagram. It is the target state, not the current system.

## Notes

- Social Proof is a planned bounded context in [bounded-contexts.md](../bounded-contexts.md). It has no module yet, so the component diagram omits it.
