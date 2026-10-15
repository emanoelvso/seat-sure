# Architecture Guidelines

Where code goes and how it is named in the Seat Sure backend. For module boundaries, communication, state isolation, repositories, and transactions, see [modular-architecture-principles.md](./modular-architecture-principles.md).

- All paths are relative to `apps/api/`.
- Examples use Seat Sure's bounded contexts. Code marked **(existing code)** is real; everything else shows the target shape for modules that don't exist yet.

## Overview

The backend is a NestJS modular monolith ([ADR-005](../../../docs/adrs/005-nestjs-as-backend-framework.md)) based on **Hexagonal** and **Clean Architecture** principles. Folder structure and file naming are enforced by `eslint-plugin-project-structure` through `.projectStructurerc.json`.

- **Domain modules** map 1:1 to the bounded contexts in [`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md). How contexts and subdomains are identified: [ddd-strategic-design-theory.md](./ddd-strategic-design-theory.md) and [domain-identification-guidelines.md](./domain-identification-guidelines.md).
- **GraphQL is the primary API** ([ADR-001](../../../docs/adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md)). REST exists only for Stripe webhooks, uploads, and health checks.
- **PostgreSQL + Redis** ([ADR-002](../../../docs/adrs/002-postgresql-and-redis-as-database-stack.md)), accessed through TypeORM and BullMQ.
- **kebab-case** for every file and folder, with a suffix that states the file's purpose.

## Architecture Principles

1. **Domain-Driven Design**: business logic is organized by bounded context. Each module is self-contained with its own models, services, use cases, and data. Complex contexts can be split into sub-domains.
2. **Layered Architecture**: every module uses the same layers:
   - **Core**: business logic, domain models, use cases
   - **HTTP**: GraphQL resolvers, REST controllers, input/output types, outbound HTTP clients
   - **Persistence**: entities, repositories, migrations, the module's DataSource
   - **Queue**: BullMQ producers and consumers
   - **Integration**: public API providers and external service providers
3. **Naming Conventions**: kebab-case file and folder names with strict suffixes (see [Naming Convention Reference](#naming-convention-reference)).

---

## Root Structure

```
apps/api/
├── .projectStructurerc.json      # Folder/naming rules, enforced by ESLint
├── src/
│   ├── main.ts                   # Entry point (calls initializeTransactionalContext)
│   ├── {kebab-case}.main.ts      # Additional entry points (e.g. a queue worker)
│   ├── app.module.ts             # Root module, imports every domain module
│   └── module/
│       ├── catalog/              # Domain module (one per bounded context)
│       └── shared/               # Cross-cutting technical modules
├── load/                         # k6 load tests and the oversell check (load/README.md)
└── test/                         # Global test infrastructure
    ├── test-e2e.setup.ts         # createNestApp()
    ├── knex.database.ts          # testDbClient for seeding/cleanup
    ├── enum/table.enum.ts        # Tables enum
    ├── jest.e2e.ts               # Jest config used by `test` / `test:e2e`
    ├── jest.load.ts              # Jest config used by `test:load` (load/ specs)
    └── jest.shared.ts            # Shared Jest config (moduleNameMapper)
```

### Domain Modules

| Bounded context   | Module folder   | DataSource name |
| ----------------- | --------------- | --------------- |
| Identity & Access | `identity`      | `identity`      |
| User Profile      | `user-profile`  | `user-profile`  |
| Catalog           | `catalog`       | `catalog`       |
| Ticketing         | `ticketing`     | `ticketing`     |
| Billing           | `billing`       | `billing`       |
| Social Proof      | `social-proof`  | `social-proof`  |
| Notifications     | `notifications` | `notifications` |

Every module folder must be listed under `module_folder` in `.projectStructurerc.json`, or lint rejects it.

### Path Aliases

| Alias              | Points to                    |
| ------------------ | ---------------------------- |
| `@catalogModule/*` | `src/module/catalog/*`       |
| `@sharedModules/*` | `src/module/shared/module/*` |
| `@sharedLibs/*`    | `src/module/shared/*`        |
| `@testInfra/*`     | `test/*`                     |
| `@src/*`           | `src/*`                      |

New modules get a `@{camelCaseName}Module/*` alias in both `tsconfig.json` (`paths`) and `test/jest.shared.ts` (`moduleNameMapper`).

---

## Domain Module Structure

### Standard Domain Module

```
catalog/
├── catalog.module.ts     # Module definition
├── __test__/             # e2e tests and factories (see Test Structure)
├── core/                 # Business logic
├── http/                 # GraphQL, REST, HTTP clients, guards
├── persistence/          # Entities, repositories, migrations, DataSource
├── queue/                # BullMQ producers/consumers (optional)
└── integration/          # Public API and external providers (optional)
```

### Sub-Domain Module

When a context grows into clearly separate parts, it can hold nested domain modules (`sub_domain_module_folder` in `.projectStructurerc.json`):

```
catalog/
├── catalog.module.ts     # Parent module
├── __test__/
├── admin/                # Sub-domain, follows the standard domain module structure
└── browse/               # Sub-domain
```

Don't split a module until it has a real reason to; start with a standard domain module. Sub-domain modules separate operational areas (e.g. back-office admin vs public browsing), each with its own NestJS module.

### Feature Folders

When a domain module grows to about five services or use cases, organize it by business feature instead: `catalog/event/`, `catalog/artist/`, each with its own `core/`, `http/`, and `persistence/` layers, all registered in the single `{module}.module.ts`. Features are folders, never NestJS modules. See [feature-folders-guidelines.md](./feature-folders-guidelines.md).

`.projectStructurerc.json` has a `feature_domain_module_folder` rule for this shape, but no module uses feature folders yet, so no module entry points at it.

---

## Core Layer (`core/`)

Pure business logic, independent of transport and storage details.

```
core/
├── enum/{name}.enum.ts                    # e.g. event-status.enum.ts
├── model/{name}.model.ts                  # Domain models
├── service/{name}.service.ts              # e.g. catalog.service.ts
├── use-case/                              # Optional, for orchestration
│   ├── {name}.use-case.ts
│   └── __test__/integration/{name}.use-case.spec.ts
├── exception/{name}.exception.ts          # Domain exceptions
└── adapter/{name}.adapter.interface.ts    # Interfaces for external dependencies
```

### Core Layer Principles

1. **Framework independence**: business rules don't depend on the transport or the ORM. `core/` never imports from `http/` (GraphQL types, DTOs). NestJS DI decorators (`@Injectable`, `@Inject`) are fine.
2. **Use cases are optional**: use them for orchestration, not for every operation.
3. **Rich domain models**: models carry business behavior, not just data.
4. **Adapters**: external dependencies (payment gateway, storage, email) are interfaces in `core/adapter/`, implemented in `integration/provider/` or `http/client/`.

### When to Use Use Cases vs Services

Use a **use case** when:

- The operation orchestrates several services, repositories, or modules
- The workflow has multiple steps or must be transactional as a whole
- You want the business workflow testable on its own

A **service** alone is enough when:

- The operation is simple and needs no orchestration
- The domain logic is straightforward

```typescript
// Simple operation: a service method is enough
@Injectable()
export class CatalogService {
  async findArtistBySlug({ slug }: { slug: string }) {
    return this.artistRepository.findOne({ where: { slug } });
  }
}

// Orchestration: a use case
@Injectable()
export class CheckoutUseCase {
  constructor(
    private readonly seatHoldService: SeatHoldService,
    private readonly orderService: OrderService,
    @Inject(CatalogEventApi) private readonly catalogEventApi: CatalogEventApi,
  ) {}

  async execute(input: CheckoutCommand): Promise<OrderModel> {
    const event = await this.catalogEventApi.findPublishedEvent(input.eventId);
    if (!event) throw new EventNotAvailableException(input.eventId);

    await this.seatHoldService.hold(input.userId, input.eventId, input.seatIds);
    return this.orderService.createPending(input.userId, event, input.items);
  }
}
```

---

## HTTP Layer (`http/`)

```
http/
├── graphql/                             # Primary API (ADR-001)
│   ├── {name}.resolver.ts               # e.g. catalog.resolver.ts
│   └── type/
│       ├── {name}.type.ts               # @ObjectType outputs, e.g. event-tickets.type.ts
│       └── {name}-input.type.ts         # @InputType args, e.g. find-event-tickets-input.type.ts
├── rest/                                # Only webhooks, uploads, health (ADR-001)
│   ├── controller/{name}.controller.ts
│   ├── dto/
│   │   ├── request/*-request.dto.ts
│   │   └── response/*-response.dto.ts
│   └── interceptor/{name}.interceptor.ts
├── client/                              # Outbound HTTP clients
│   ├── *.client.ts
│   └── {name}/*.client.ts
└── guard/{name}.guard.ts                # Module-specific guards
```

The `-input.type.ts` suffix is a project convention; lint only checks `{kebab-case}.type.ts`.

### HTTP Layer Principles

1. **Thin resolvers and controllers**: they only handle transport and delegate to one use case or service (see [Lean Resolvers & Controllers](./modular-architecture-principles.md#lean-resolvers--controllers)).
2. **Validate at the boundary**: `@InputType` classes and request DTOs use `class-validator` decorators. Domain rules are validated in `core/`.
3. **Separate inputs from outputs**: `@InputType` for arguments, `@ObjectType` for results; request and response DTOs for REST.
4. **Don't expose entities**: resolvers return GraphQL types, controllers return response DTOs.
5. **A closed set of values is a GraphQL enum, never a raw `String!`.** Register it with `registerEnumType` (see `LogInStatus` for the pattern) and map it to the internal representation at the resolver boundary. Identity's `resendCode` originally took `purpose: String!`; the web and the API quietly settled on different spellings (`'verify-email'` vs `'verify_email'`), and nothing caught it until a user-visible bug shipped. An enum makes that mismatch a type error instead.
6. **REST only when required**: Stripe webhooks, multipart uploads, `GET /health`. Everything else is GraphQL.
7. **Authentication**: `AuthGuard` (`@sharedModules/auth/guard/auth.guard`) works for GraphQL and REST. It verifies the `Authorization: Bearer` access token (a JWT signed with `JWT_SECRET`) without a database call and stores `userId` and `sessionId` in `ClsService` ([ADR-016](../../../docs/adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)). The API never reads or sets cookies; the web server holds the tokens. Only Identity checks whether a session was revoked.
8. **HTTP clients**: calls to external APIs live in `http/client/` and use the shared `HttpClient` (`@sharedModules/http-client/client/http.client`).
9. **Card data**: only Billing touches a card, and only as a gateway token plus display data (brand, last 4, expiry, holder) and a keyed fingerprint (`BILLING_FINGERPRINT_SECRET`). The number and CVV are never stored, logged, put in an error message, or returned, and neither are the token and fingerprint ([ADR-020](../../../docs/adrs/020-saved-cards-as-gateway-tokens.md)). Other modules reach cards through `BillingApi` with a saved card id.

---

## Persistence Layer (`persistence/`)

```
persistence/
├── {module}-persistence.module.ts   # Registers the module's named TypeORM DataSource
├── typeorm-datasource.ts            # DataSource for the TypeORM CLI (migrations)
├── typeorm-datasource.factory.ts    # Options: entities glob, migrations, migrationsTableName
├── entity/{name}.entity.ts          # e.g. ticket-type.entity.ts
├── repository/{name}.repository.ts  # e.g. ticket-type.repository.ts
└── migration/*-migration.ts         # e.g. 1790550000000-migration.ts
```

### Persistence Layer Principles

1. **Repository pattern**: all database access goes through repositories that extend `DefaultTypeOrmRepository`.
2. **Entities stay in persistence**: entities never reach resolvers or other modules.
3. **Domain models ≠ entities**: map entities to domain models when the domain has behavior of its own.
4. **One DataSource per module**: each module has its own persistence module, a named DataSource, and its own migrations table (`migrationsTableName: '{module}_migrations'`).
5. **Module-prefixed table names**: `@Entity('TicketingOrder')` (see [State Isolation](./modular-architecture-principles.md#8-state-isolation)).
6. **Migrations**: generated and run per module through `package.json` scripts, e.g. `pnpm --filter api catalog:db:generate` and `catalog:db:migrate`.

---

## Queue Layer (`queue/`)

```
queue/
├── queue.constant.ts                    # Queue names and job payloads used only inside this module
├── producer/{name}.queue-producer.ts
└── consumer/{name}.queue-consumer.ts
```

### Queue Layer Principles

1. **BullMQ, not Bull**: the project uses `@nestjs/bullmq`. Consumers extend `WorkerHost` and implement `process()`; there is no `@Process()` decorator.
2. **Separate producers and consumers**: one file per producer and per consumer.
3. **Centralized names**: queue names and job names are constants. Queues or payloads used by other modules are contracts and live in `src/module/shared/module/integration/` (see [Explicit Communication](./modular-architecture-principles.md#5-explicit-communication)).
4. **Idempotent consumers**: a job can be delivered more than once; processing it twice must be safe.
5. **Retries**: configure `attempts` and `backoff` when adding jobs that can fail transiently.
6. **Serializable payloads**: job data is stored as JSON, so use ISO strings instead of `Date` objects.

---

## Integration Layer (`integration/`)

```
integration/
└── provider/{name}.provider.ts   # e.g. public-api.provider.ts, stripe-payment.provider.ts
```

### Integration Layer Principles

1. **Public API provider**: `public-api.provider.ts` implements the module's contract from `shared/module/integration/interface/` and is the only thing the module exports.
2. **External service providers**: wrap third-party SDKs and implement an interface from `core/adapter/`.
3. **Error handling**: handle external failures gracefully (see [Fail Independence](./modular-architecture-principles.md#10-fail-independence)).
4. **Configuration**: API keys and endpoints come from `ConfigService`, never literals.

---

## Test Structure

```
{module}/__test__/
├── e2e/
│   ├── {feature}/{name}.spec.ts         # e.g. e2e/catalog/event-tickets.spec.ts
│   └── {name}.*.ts                      # e2e helpers
├── factory/{name}.factory.ts            # e.g. ticket-type.factory.ts
└── {name}.{suffix}.ts                   # Other test utilities

{module}/core/use-case/__test__/integration/{name}.use-case.spec.ts
```

### Testing Principles

1. **Test modules in isolation**: e2e tests boot only their module with `createNestApp([CatalogModule])`.
2. **Real database**: seed and clean tables with `testDbClient(Tables.X)`; add every new table to `test/enum/table.enum.ts`.
3. **Factories**: build rows with `factory.ts` + `@faker-js/faker`.
4. **Behavior over implementation**: e2e tests hit `/graphql` (or the REST route) and assert on the response.
5. **Running tests**: `pnpm --filter api test:db:reset` once, then `pnpm --filter api test:e2e`. Jest only picks up specs under `__test__/e2e/` and `__test__/integration/` (`test/jest.e2e.ts`).
6. **Unit tests**: no folder for them is defined in `.projectStructurerc.json` or matched by `test/jest.e2e.ts` yet. Add both before writing the first one.
7. **Load tooling**: the oversell check's specs live under `load/__test__/integration/` as native ESM (`.mjs`) and run with `pnpm --filter api test:load` (`test/jest.load.ts`), not `test:e2e`.

---

## Shared Module (`shared/`)

```
shared/
├── core/
│   └── model/default.model.ts           # Base domain model
└── module/
    ├── auth/                            # AuthGuard, JwtModule (JWT_SECRET), ClsModule
    ├── config/                          # ConfigService (zod-validated env)
    ├── http-client/                     # HttpClient wrapper around @nestjs/axios
    ├── logger/                          # Winston logger (LoggerFactory)
    ├── persistence/typeorm/             # DefaultEntity, DefaultTypeOrmRepository, TypeOrmPersistenceModule
    └── integration/                     # Contracts between modules (create when first needed)
```

### Shared Module Principles

1. **Don't overuse**: only truly shared code belongs here.
2. **No business logic**: shared modules are technical. The exception is `integration/`, which holds contracts (interfaces, tokens, job payloads) and no behavior.
3. **Backward compatibility**: a change here affects every module.
4. **Not the same as `packages/shared`**: the `@seat-sure/shared` workspace package holds types shared with `apps/web`. Backend code stays in `src/module/shared/`.

---

## Naming Convention Reference

| Type                | Pattern                               | Example                                |
| ------------------- | ------------------------------------- | -------------------------------------- |
| Module              | `{kebab-case}.module.ts`              | `catalog.module.ts`                    |
| Persistence module  | `{kebab-case}-persistence.module.ts`  | `catalog-persistence.module.ts`        |
| Entity              | `{kebab-case}.entity.ts`              | `ticket-type.entity.ts`                |
| Repository          | `{kebab-case}.repository.ts`          | `ticket-type.repository.ts`            |
| Migration           | `*-migration.ts`                      | `1790550000000-migration.ts`           |
| Service             | `{kebab-case}.service.ts`             | `catalog.service.ts`                   |
| Use Case            | `{kebab-case}.use-case.ts`            | `checkout.use-case.ts`                 |
| Model               | `{kebab-case}.model.ts`               | `order.model.ts`                       |
| Enum                | `{kebab-case}.enum.ts`                | `event-status.enum.ts`                 |
| Exception           | `{kebab-case}.exception.ts`           | `event-not-available.exception.ts`     |
| Adapter             | `{kebab-case}.adapter.interface.ts`   | `payment-gateway.adapter.interface.ts` |
| Resolver            | `{kebab-case}.resolver.ts`            | `catalog.resolver.ts`                  |
| GraphQL output type | `{kebab-case}.type.ts`                | `event-tickets.type.ts`                |
| GraphQL input type  | `{kebab-case}-input.type.ts`          | `find-event-tickets-input.type.ts`     |
| Controller          | `{kebab-case}.controller.ts`          | `stripe-webhook.controller.ts`         |
| Request DTO         | `*-request.dto.ts`                    | `upload-image-request.dto.ts`          |
| Response DTO        | `*-response.dto.ts`                   | `upload-image-response.dto.ts`         |
| HTTP client         | `*.client.ts`                         | `stripe.client.ts`                     |
| Guard               | `{kebab-case}.guard.ts`               | `auth.guard.ts`                        |
| Interceptor         | `{kebab-case}.interceptor.ts`         | `transform.interceptor.ts`             |
| Queue constants     | `queue.constant.ts`                   | `queue.constant.ts`                    |
| Queue producer      | `{kebab-case}.queue-producer.ts`      | `order-events.queue-producer.ts`       |
| Queue consumer      | `{kebab-case}.queue-consumer.ts`      | `payment-succeeded.queue-consumer.ts`  |
| Provider            | `{kebab-case}.provider.ts`            | `public-api.provider.ts`               |
| Factory             | `{kebab-case}.factory.ts`             | `ticket-type.factory.ts`               |
| E2E spec            | `{kebab-case}.spec.ts`                | `event-tickets.spec.ts`                |
| Use case spec       | `{kebab-case}.use-case.spec.ts`       | `checkout.use-case.spec.ts`            |

---

## Development Workflows

### Adding a New Domain Module

1. Add the folder name to `module_folder` in `.projectStructurerc.json`.
2. Add the `@{camelCaseName}Module/*` alias to `tsconfig.json` and `test/jest.shared.ts`.
3. Create `src/module/{name}/{name}.module.ts`.
4. Create the persistence layer by copying Catalog's:
   - `typeorm-datasource.factory.ts` with `migrationsTableName: '{name}_migrations'`
   - `typeorm-datasource.ts`
   - `{name}-persistence.module.ts` with `name: '{name}'` and a `dataSourceFactory` that calls `addTransactionalDataSource` (see [Transactions](./modular-architecture-principles.md#transaction-management--named-connections))
5. Add `{name}:db:generate`, `{name}:db:migrate`, and `{name}:db:drop` scripts to `package.json`, and include them in the `db:*:all` scripts and `test:db:reset`.
6. Import the module in `src/app.module.ts`.
7. Add the module's tables to `test/enum/table.enum.ts`.
8. If the module has resolvers: `GraphQLModule.forRoot` is already registered once, in `src/module/shared/module/graphql/graphql.module.ts` (`GraphqlModule`), imported by `AppModule` and prepended by `createNestApp()`. Domain modules don't import `GraphQLModule` themselves.

### Adding a GraphQL Query or Mutation

1. Create the input type in `http/graphql/type/{name}-input.type.ts`, with `class-validator` decorators and `@Field()`.
2. Create the output type in `http/graphql/type/{name}.type.ts`.
3. Add the service (or use case) method in `core/`. It takes plain arguments, not GraphQL types.
4. Add the resolver method: read args, call one service method, return.
5. Add an e2e spec that posts the query to `/graphql`.

```typescript
// src/module/catalog/http/graphql/catalog.resolver.ts (existing code)
@Query(() => EventTickets)
async findEventTickets(
  @Args('FindEventTicketsInput') { eventId }: FindEventTicketsInput,
): Promise<EventTickets> {
  return this.catalogService.findEventTickets({ eventId });
}
```

### Adding a New Entity and Repository

1. **Entity** (module-prefixed table name, plain IDs for other modules' records):

   ```typescript
   // src/module/ticketing/persistence/entity/order.entity.ts
   @Entity('TicketingOrder')
   export class Order extends DefaultEntity<Order> {
     @Column({ type: 'uuid' })
     userId: string; // User Profile reference, no FK

     @Column({ type: 'uuid' })
     eventId: string; // Catalog reference, no FK

     @Column({ type: 'enum', enum: OrderStatus })
     status: OrderStatus;

     @Column({ type: 'int' })
     totalCents: number;
   }
   ```

2. **Repository** (extends `DefaultTypeOrmRepository`, injects the module's named DataSource):

   ```typescript
   // src/module/ticketing/persistence/repository/order.repository.ts
   @Injectable()
   export class OrderRepository extends DefaultTypeOrmRepository<Order> {
     constructor(
       @InjectDataSource('ticketing')
       readonly dataSource: DataSource,
     ) {
       super(Order, dataSource.manager);
     }

     async findPendingByUser(userId: string): Promise<Order[] | null> {
       return this.find({ where: { userId, status: OrderStatus.PENDING } });
     }
   }
   ```

3. **Register** the repository in `providers` and `exports` of `ticketing-persistence.module.ts`.
4. **Migration**: `pnpm --filter api ticketing:db:generate`, review the generated file, then `ticketing:db:migrate`.
5. **Tests**: add the table to `test/enum/table.enum.ts` and create a factory.

### Adding a Queue Producer and Consumer

1. **Constants** (module-internal queue):

   ```typescript
   // src/module/ticketing/queue/queue.constant.ts
   export const TICKETING_QUEUES = {
     SEAT_HOLD_EXPIRATION: 'ticketing-seat-hold-expiration',
   } as const;

   export interface SeatHoldExpirationJobData {
     seatHoldId: string;
     expiresAt: string; // ISO date
   }
   ```

2. **Register the queue** in the module: `BullModule.registerQueue({ name: TICKETING_QUEUES.SEAT_HOLD_EXPIRATION })`. The Redis connection (`BullModule.forRootAsync` with `redis.host` / `redis.port` from `ConfigService`) is registered once for the whole app.

3. **Producer**:

   ```typescript
   // src/module/ticketing/queue/producer/seat-hold-expiration.queue-producer.ts
   import { InjectQueue } from '@nestjs/bullmq';
   import { Queue } from 'bullmq';

   @Injectable()
   export class SeatHoldExpirationQueueProducer {
     constructor(
       @InjectQueue(TICKETING_QUEUES.SEAT_HOLD_EXPIRATION)
       private readonly queue: Queue<SeatHoldExpirationJobData>,
     ) {}

     async schedule(data: SeatHoldExpirationJobData, delayMs: number) {
       await this.queue.add('seat-hold.expire', data, {
         delay: delayMs,
         attempts: 3,
         backoff: { type: 'exponential', delay: 1000 },
       });
     }
   }
   ```

4. **Consumer** (must be listed in the module's `providers`):

   ```typescript
   // src/module/ticketing/queue/consumer/seat-hold-expiration.queue-consumer.ts
   import { Processor, WorkerHost } from '@nestjs/bullmq';
   import { Job } from 'bullmq';

   @Processor(TICKETING_QUEUES.SEAT_HOLD_EXPIRATION)
   export class SeatHoldExpirationQueueConsumer extends WorkerHost {
     constructor(private readonly seatHoldService: SeatHoldService) {
       super();
     }

     async process(job: Job<SeatHoldExpirationJobData>): Promise<void> {
       await this.seatHoldService.releaseIfExpired(job.data.seatHoldId);
     }
   }
   ```

### Adding a REST Endpoint

Only for Stripe webhooks, uploads, and health checks.

1. Create request/response DTOs in `http/rest/dto/request/` and `http/rest/dto/response/`.
2. Create the controller in `http/rest/controller/{name}.controller.ts`, delegating to a service.
3. Register it in the module's `controllers`.

```typescript
// src/module/billing/http/rest/controller/stripe-webhook.controller.ts
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<void> {
    await this.paymentService.handleStripeEvent(request.rawBody, signature);
  }
}
```

---

## Best Practices

### 1. Dependency Injection

- Use constructor injection for all dependencies.
- Inject interfaces (via `Symbol` tokens) instead of concrete classes when crossing modules or wrapping external services.
- Break circular dependencies with interfaces or events.

### 2. Error Handling

- Create domain exceptions in `core/exception/` (e.g. `EventNotAvailableException`).
- Let exceptions bubble up; NestJS turns `HttpException` subclasses into GraphQL errors or HTTP responses.
- A missing record in a lookup query is a `null` result, not an error ([ADR-014](../../../docs/adrs/014-not-found-as-null-results-in-graphql-queries.md)).
- A business rule the user can trip (email taken, account locked, code expired) extends `UnprocessableEntityException` with `{ reason, message, fields? }`. Clients get `extensions.code: "BAD_USER_INPUT"` and read `extensions.originalError.reason`, an `UPPER_SNAKE` code owned by the module; `fields` maps input fields to messages ([ADR-018](../../../docs/adrs/018-business-errors-as-unprocessable-entity-with-a-reason-code.md)).
- Missing or invalid credentials throw `UnauthorizedException` (`UNAUTHENTICATED`). Other HTTP statuses surface as `INTERNAL_SERVER_ERROR`, so don't use them for user-facing errors.

```typescript
// src/module/ticketing/core/exception/event-not-available.exception.ts
export class EventNotAvailableException extends NotFoundException {
  constructor(eventId: string) {
    super(`Event ${eventId} is not available for sale`);
  }
}

// A user-facing business error (ADR-018)
// src/module/identity/core/exception/identity.exception.ts
export class IdentityException extends UnprocessableEntityException {
  constructor(reason: IdentityErrorReason, message: string, fields?: Record<string, string>) {
    super({ statusCode: 422, reason, message, fields });
  }
}
```

### 3. Validation

- `class-validator` on `@InputType` classes and request DTOs; `ValidationPipe` runs at the boundary.
- Domain invariants are validated in models and services. When the user must see a message per field (lengths, formats), the rules and messages live in `core/model/` and the service throws them as `fields` (ADR-018). `class-validator` on the input then only checks types.

### 4. Environment Configuration

- Never hardcode environment-specific values.
- Read config through `ConfigService` (`@sharedModules/config/service/config.service`).
- New variables go into the zod schema (`shared/module/config/util/config.schema.ts`) and `.env.default`, so startup fails fast when they're missing.

### 5. Logging

- Use NestJS `Logger` with a context name; `main.ts` routes it to the shared Winston logger.
- Include identifiers (`orderId`, `eventId`, `userId`) in messages; never log passwords, password hashes, tokens, verification codes, or card data. The dev code sender is the one exception: it logs codes, and the API refuses to start with it in production.

### 6. Database Migrations

- Generate migrations with the module's scripts and commit them.
- Never modify a migration that has already run in a shared environment; add a new one.
- Write reversible `down()` methods when possible.

### 7. Testing

- Write tests alongside the implementation.
- Test behavior, not implementation.
- Use factories for test data and a real database for e2e tests.

---

## Anti-Patterns to Avoid

### ❌ Mixing Layers

```typescript
// BAD: resolver talks to the repository
@Resolver()
export class OrderResolver {
  constructor(private readonly orderRepository: OrderRepository) {}

  @Query(() => [OrderType])
  async myOrders() {
    return this.orderRepository.find({ where: { userId: '...' } });
  }
}

// GOOD: resolver delegates to a service (or use case)
@Resolver()
export class OrderResolver {
  constructor(
    private readonly orderService: OrderService,
    private readonly clsService: ClsService,
  ) {}

  @Query(() => [OrderType])
  @UseGuards(AuthGuard)
  async myOrders(): Promise<OrderType[]> {
    return this.orderService.listByUser(this.clsService.get('userId'));
  }
}
```

### ❌ Exposing Entities

Returning TypeORM entities from resolvers couples the API schema to the database schema. Return `@ObjectType` classes and map in the resolver or service.

### ❌ Business Logic in Resolvers or Controllers

```typescript
// BAD
@Mutation(() => OrderType)
async checkout(@Args('CheckoutInput') input: CheckoutInput) {
  if (input.items.length > 8) {
    // pricing, availability, and limit rules here...
  }
}

// GOOD
@Mutation(() => OrderType)
async checkout(@Args('CheckoutInput') input: CheckoutInput) {
  return this.checkoutUseCase.execute({ userId: this.clsService.get('userId'), ...input });
}
```

### ❌ Tight Coupling to External Services

```typescript
// BAD: Stripe SDK used directly in a service
export class PaymentService {
  async charge(order: Order) {
    await stripe.paymentIntents.create({ amount: order.totalCents, currency: 'brl' });
  }
}

// GOOD: service depends on an adapter interface
export class PaymentService {
  constructor(
    @Inject(PaymentGatewayAdapter)
    private readonly paymentGateway: PaymentGatewayAdapter,
  ) {}

  async charge(order: Order) {
    return this.paymentGateway.charge({ orderId: order.id, amountCents: order.totalCents });
  }
}
```

### ❌ God Services

A service that grows unrelated responsibilities (events, artists, venues, seat maps, pricing...) should be split into focused services or use cases. Once a module has about five of them, group them into [feature folders](./feature-folders-guidelines.md).

---

## Structure Enforcement

Folder structure and file names are validated by `eslint-plugin-project-structure` using `.projectStructurerc.json`:

```bash
pnpm --filter api lint:check   # pre-commit runs `eslint --fix` on staged files
pnpm --filter api lint:fix
```

Common validation errors:

1. **Wrong file name**: `ticketTypeRepository.ts` → `ticket-type.repository.ts`
2. **Wrong folder**: resolver in `core/` → `http/graphql/`
3. **Missing suffix**: `order.ts` → `order.entity.ts` or `order.model.ts`
4. **Unknown module**: new module folder not listed under `module_folder` in `.projectStructurerc.json`
