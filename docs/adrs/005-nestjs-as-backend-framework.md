# ADR-005: NestJS as the Backend Framework

- **Date**: 2026-09-10
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, backend, nestjs, nodejs, typescript
- **Links**:
  - [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md)
  - [ADR-002: PostgreSQL and Redis as Database Stack](./002-postgresql-and-redis-as-database-stack.md)

## Context

The backend must serve a GraphQL API (ADR-001), integrate with PostgreSQL and Redis (ADR-002), handle payment webhooks via REST, and enforce authentication on protected mutations. The project is written entirely in TypeScript — the frontend is Next.js and the monorepo shares types across packages. A backend framework was needed that fits naturally into this TypeScript-first environment, provides first-class GraphQL support, and imposes enough structure to remain maintainable as the codebase grows without requiring the team to build that structure from scratch.

## Decision

We will use **NestJS** as the backend framework. NestJS provides a module-based architecture with dependency injection, decorator-driven code, and official integrations for every layer of the stack required by this project:

- **`@nestjs/graphql`** with Apollo Server — code-first GraphQL schema generation from TypeScript decorators, eliminating the need to maintain a separate `.graphql` schema file in sync with resolvers
- **Prisma or TypeORM** via NestJS module integrations — PostgreSQL access with full TypeScript types
- **`@nestjs/cache-manager` with Redis adapter** — cache layer over Redis without manual client wiring
- **Guards, Pipes, and Interceptors** — built-in extension points for JWT authentication, request validation, and response transformation, removing the need to implement middleware chains manually

Express.js and Fastify were considered but rejected. Both are minimal HTTP servers with no conventions for organizing resolvers, services, repositories, or authentication — every team builds its own structure, leading to inconsistency and boilerplate. For a portfolio project where the architectural decisions should be visible and intentional, NestJS's opinionated structure makes the codebase easier to evaluate and extend.

tRPC was considered as an alternative to GraphQL + NestJS but was ruled out because the project explicitly adopted GraphQL in ADR-001; tRPC and GraphQL serve overlapping purposes and combining them adds complexity without benefit.

## Consequences

### Benefits

- The module + provider + service + resolver pattern forces clear separation of concerns from the start — business logic never bleeds into transport layers
- Code-first GraphQL with `@nestjs/graphql` means the TypeScript class definitions *are* the schema; type drift between schema and implementation is impossible
- Official integrations for PostgreSQL, Redis, JWT, validation (`class-validator`), and Swagger/OpenAPI reduce the surface area of custom wiring code
- NestJS is widely adopted in TypeScript backends (used by companies like Adidas, Decathlon, and Capgemini), making it recognizable and credible in a portfolio context
- The dependency injection system makes unit testing straightforward — services and resolvers can be tested with mocked providers without spinning up HTTP servers

### Challenges

- NestJS's decorator-heavy style generates significant boilerplate for simple operations (a CRUD endpoint requires a module, controller/resolver, service, and DTO); this is a trade-off for structure
- The framework's abstraction layers can obscure what is happening at the HTTP level, making debugging unfamiliar errors harder for developers new to NestJS
- NestJS defaults to Express under the hood; switching to Fastify for performance is possible but requires intentional configuration

### Trade-offs

- A minimal framework (Express, Fastify, Hono) would produce less boilerplate and start faster, but would require building the module organization, DI system, and GraphQL wiring that NestJS provides out of the box — the net effort is higher, and the result is less standardized
- A different language backend (Go with gqlgen, or Rust with async-graphql) would offer superior runtime performance, but would break the TypeScript monorepo's shared type contract between frontend and backend and introduce a second language ecosystem to maintain
