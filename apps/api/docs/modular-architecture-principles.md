# Modular Architecture Principles

How modules stay independent in the Seat Sure backend: boundaries, communication, state, repositories, transactions, and testing. For folder structure, naming, and step-by-step workflows, see [architecture-guidelines.md](./architecture-guidelines.md).

- All paths are relative to `apps/api/`.
- Examples use Seat Sure's bounded contexts ([`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md)). Code marked **(existing code)** is real; everything else shows the target shape for modules that don't exist yet.

## Rules at a Glance

These are mandatory. The rest of this document explains each one.

1. **Boundaries**: a module exports only its public API provider. Nothing else is imported from another module. ([§1](#1-well-defined-boundaries))
2. **Contracts**: modules talk through contracts in `src/module/shared/module/integration/`: synchronously via public API providers, asynchronously via BullMQ jobs. ([§5](#5-explicit-communication), [Communication Patterns](#inter-module-communication-patterns))
3. **State isolation**: each module owns its named DataSource, entities, migrations table, and tables. No foreign keys, relations, joins, or repository access across modules. ([§8](#8-state-isolation))
4. **Entity naming**: table names are prefixed with the module name, e.g. `@Entity('CatalogEvent')`, `@Entity('TicketingOrder')`. ([§8](#entity-naming-conventions))
5. **Repositories**: extend `DefaultTypeOrmRepository`, inject the module's named DataSource, and never let ORM APIs leave the repository. ([Repository Pattern](#repository-pattern--orm-encapsulation))
6. **Lean resolvers and controllers**: parse input, read user context, call one service or use case, return. ([Lean Resolvers & Controllers](#lean-resolvers--controllers))
7. **Transactions**: service methods that write use `@Transactional({ connectionName: '<module>' })`. ([Transactions](#transaction-management--named-connections))
8. **Testing independence**: each module's e2e tests boot only that module. ([§3](#3-independence), [Testing](#testing-module-independence))

---

## Introduction

**Modular architecture** keeps clear boundaries between business domains inside a single application. The key insight: **modules are logical boundaries defined by discipline, not physical separation**.

> Modular architecture is about **discipline**, not tools. Boundaries are enforced through conventions, interfaces, and code reviews, not build systems.

Modules are defined by:

- Clear responsibilities
- Explicit interfaces
- Independent state
- Isolated testing

They are **not** separate npm packages, repositories, or deployments (at least initially).

### How Seat Sure Applies It

| Aspect         | Seat Sure                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Structure      | `src/module/{context}/`, one module per bounded context                                                     |
| Entry point    | Single `src/main.ts`                                                                                        |
| Dependencies   | Single `apps/api/package.json`                                                                              |
| Database       | One PostgreSQL instance (ADR-002); each module has its own named DataSource, tables, and migrations table |
| Async messages | BullMQ on Redis                                                                                             |
| API            | GraphQL first (ADR-001)                                                                                     |
| Deployment     | Single application (initially)                                                                              |
| Shared code    | `src/module/shared/` (technical only, plus inter-module contracts)                                          |

### Organize by Business Capability

```
✅ GOOD: domain organization
src/module/catalog/
src/module/ticketing/
src/module/billing/

❌ BAD: technical organization
src/resolvers/
src/services/
src/repositories/
```

### Evolutionary Design

1. **Phase 1**: all modules in one application, with good boundaries
2. **Phase 2**: identify high-load or independent modules (e.g. Catalog is read-heavy, Ticketing spikes on sales)
3. **Phase 3**: extract those modules to separate services
4. **Phase 4**: keep operating the rest as a monolith

This gives **flexibility without premature complexity**. Every rule below exists to keep Phase 3 a refactor, not a rewrite.

---

## The 10 Principles of Modular Architecture

### 1. Well-Defined Boundaries

Each module has clear responsibilities and doesn't expose its internals.

- ✅ **DO**: keep all domain logic inside the module
- ✅ **DO**: export only the public API provider from the module
- ❌ **DON'T**: import another module's services, repositories, entities, or GraphQL types
- ❌ **DON'T**: share entities between modules

```typescript
// ✅ GOOD: the module exports only its public API
// src/module/catalog/catalog.module.ts
@Module({
  imports: [CatalogPersistenceModule],
  providers: [
    CatalogService,
    CatalogResolver,
    { provide: CatalogEventApi, useClass: CatalogPublicApiProvider },
  ],
  exports: [CatalogEventApi],
})
export class CatalogModule {}

// ❌ BAD: another module reaching into Catalog's internals
import { EventRepository } from '@catalogModule/persistence/repository/catalog.repository';
import { Event } from '@catalogModule/persistence/entity/event.entity';
```

```
src/module/catalog/
├── catalog.module.ts          # Exports only the public API token
├── core/                      # Internal
├── http/                      # Internal
├── persistence/               # Internal
└── integration/
    └── provider/
        └── public-api.provider.ts   # Implements the contract from shared/module/integration
```

### 2. Composability

Modules are building blocks that work alone or together.

- ✅ **DO**: design modules to work independently or composed in `AppModule`
- ✅ **DO**: use dependency injection for loose coupling
- ❌ **DON'T**: create tight coupling between modules

```typescript
// src/app.module.ts
@Module({
  imports: [
    CatalogModule,
    TicketingModule,
    BillingModule,
  ],
})
export class AppModule {}
```

When a module is extracted, the consumer swaps the in-process provider for an HTTP client that implements the same contract, and nothing else changes:

```typescript
// After extracting Catalog to its own service
@Module({
  providers: [{ provide: CatalogEventApi, useClass: CatalogEventHttpClient }],
  exports: [CatalogEventApi],
})
export class CatalogClientModule {}
```

### 3. Independence

Modules operate autonomously, without tight coupling in code or infrastructure.

- ✅ **DO**: make each module buildable and testable on its own
- ✅ **DO**: use interfaces and events for inter-module communication
- ✅ **DO**: make each module's tests runnable in isolation
- ❌ **DON'T**: share mutable state between modules
- ❌ **DON'T**: call other modules' internal services directly

```typescript
// ❌ BAD: Ticketing depends on Catalog's internal service
@Injectable()
export class CheckoutUseCase {
  constructor(private readonly catalogService: CatalogService) {}
}

// ✅ GOOD: Ticketing depends on the contract
@Injectable()
export class CheckoutUseCase {
  constructor(
    @Inject(CatalogEventApi) private readonly catalogEventApi: CatalogEventApi,
  ) {}
}
```

```typescript
// ✅ GOOD: the e2e test boots only its module (existing code)
// src/module/catalog/__test__/e2e/catalog/event-tickets.spec.ts
beforeAll(async () => {
  const nestTestSetup = await createNestApp([CatalogModule]);
  module = nestTestSetup.module;
  app = nestTestSetup.app;
});
```

### 4. Individual Scale

Each module can scale on its own resource needs.

- ✅ **DO**: tune resources per module (queue concurrency, cache TTLs, connection pools)
- ✅ **DO**: cache per module where it pays off (Catalog is read-heavy; ADR-002 puts seat availability in Redis)
- ❌ **DON'T**: create shared resource bottlenecks between modules

```typescript
// Module-specific worker concurrency
@Processor(TICKETING_QUEUES.SEAT_HOLD_EXPIRATION, { concurrency: 5 })
export class SeatHoldExpirationQueueConsumer extends WorkerHost {
  // ...
}
```

### 5. Explicit Communication

All inter-module communication goes through well-defined contracts.

- ✅ **DO**: define an interface for every interaction between modules
- ✅ **DO**: pass plain data (IDs, DTO-like interfaces) across modules, never entities
- ✅ **DO**: keep contracts in `src/module/shared/module/integration/`
- ❌ **DON'T**: access other modules' internal data structures
- ❌ **DON'T**: assume anything about another module's implementation

**Synchronous contract:**

```typescript
// src/module/shared/module/integration/interface/catalog-integration.interface.ts
export interface PublishedEventSummary {
  id: string;
  name: string;
  startAt: Date;
  venue: string;
}

export interface CatalogEventApi {
  findPublishedEvent(eventId: string): Promise<PublishedEventSummary | null>;
}

export const CatalogEventApi = Symbol('CatalogEventApi');
```

```typescript
// src/module/catalog/integration/provider/public-api.provider.ts
@Injectable()
export class CatalogPublicApiProvider implements CatalogEventApi {
  constructor(private readonly catalogService: CatalogService) {}

  async findPublishedEvent(eventId: string): Promise<PublishedEventSummary | null> {
    const event = await this.catalogService.findPublishedEvent(eventId);
    if (!event) return null;

    return {
      id: event.id,
      name: event.name,
      startAt: event.startAt,
      venue: event.venue,
    };
  }
}
```

**Asynchronous contract** (queue and payload consumed by another module):

```typescript
// src/module/shared/module/integration/queue/billing-queue.constant.ts
export const BILLING_EVENT_QUEUES = {
  TICKETING_PAYMENT_SUCCEEDED: 'ticketing-payment-succeeded',
  NOTIFICATIONS_PAYMENT_SUCCEEDED: 'notifications-payment-succeeded',
} as const;

export interface PaymentSucceededJobData {
  paymentId: string;
  orderId: string;
  userId: string;
  amountCents: number;
  succeededAt: string; // ISO date; job data is JSON-serialized
}
```

BullMQ delivers each job to **one** worker. When several modules react to the same event, give each consumer its own queue and have the producer add one job per queue.

### 6. Replaceability

Modules and their dependencies can be substituted without affecting the rest.

- ✅ **DO**: put swappable dependencies behind interfaces
- ✅ **DO**: use dependency injection for all module dependencies
- ❌ **DON'T**: depend on a concrete implementation across a boundary
- ❌ **DON'T**: export concrete classes as a module's API

```typescript
// src/module/billing/core/adapter/payment-gateway.adapter.interface.ts
export interface PaymentGatewayAdapter {
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(providerPaymentId: string, amountCents: number): Promise<RefundResult>;
}

export const PaymentGatewayAdapter = Symbol('PaymentGatewayAdapter');

// src/module/billing/integration/provider/stripe-payment.provider.ts
@Injectable()
export class StripePaymentProvider implements PaymentGatewayAdapter {
  // Stripe-specific implementation
}

// src/module/billing/billing.module.ts
@Module({
  providers: [
    PaymentService,
    { provide: PaymentGatewayAdapter, useClass: StripePaymentProvider },
  ],
})
export class BillingModule {}

// The service knows only the interface
@Injectable()
export class PaymentService {
  constructor(
    @Inject(PaymentGatewayAdapter)
    private readonly paymentGateway: PaymentGatewayAdapter,
  ) {}
}
```

### 7. Deployment Independence

Modules don't dictate how they're deployed; they run together or apart.

- ✅ **DO**: drive deployment-specific values (hosts, credentials, URLs) from environment variables through `ConfigService`
- ✅ **DO**: keep deployment logic out of module logic
- ❌ **DON'T**: hardcode deployment assumptions in modules
- ❌ **DON'T**: make modules aware of whether they run alone or together

Each module's DataSource options come from config (`persistence/typeorm-datasource.factory.ts`). Pointing a module at its own database later is a configuration change, not a code change.

### 8. State Isolation

Each module owns and manages its own state.

- ✅ **DO**: give each module its own named DataSource (`name: '<module>'`), limited to its own `persistence/entity/` glob
- ✅ **DO**: give each module its own migrations and migrations table (`migrationsTableName: '<module>_migrations'`)
- ✅ **DO**: reference other modules' records by plain `uuid` columns, and replicate the fields you need
- ✅ **DO**: use the public API or events for cross-module data needs
- ❌ **DON'T**: create foreign keys, TypeORM relations, or SQL joins to another module's tables
- ❌ **DON'T**: inject another module's DataSource or repository
- ❌ **DON'T**: declare two entities with the same table name

All modules currently point at the same PostgreSQL database (ADR-002). Isolation comes from ownership, not from separate servers. That is what keeps moving a module to its own database possible.

A consequence: **a transaction can't span modules**. Consistency across modules is eventual, driven by events.

```typescript
// ✅ GOOD: Ticketing references Catalog records by ID
// src/module/ticketing/persistence/entity/seat-hold.entity.ts
@Entity('TicketingSeatHold')
@Unique(['eventId', 'seatId'])
export class SeatHold extends DefaultEntity<SeatHold> {
  @Column({ type: 'uuid' })
  eventId: string; // Catalog event, no FK

  @Column({ type: 'uuid' })
  seatId: string; // Catalog seat, no FK

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}

// ✅ GOOD: replicate what the module needs instead of joining
@Entity('TicketingOrder')
export class Order extends DefaultEntity<Order> {
  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar' })
  eventName: string; // snapshot taken at checkout
}

// ❌ BAD: relation into another module's entity
@ManyToOne(() => Event) // Catalog's entity
event: Event;

// ❌ BAD: repository reading another module's data
@InjectDataSource('catalog') // inside the Ticketing module
```

#### Critical Violation: Duplicate Table Names

Two modules declaring the same table (`@Entity('Seat')` in Catalog and in Ticketing) means both write to one table: unclear ownership, conflicting migrations, and no way to separate them later.

Check for duplicates from `apps/api`:

```bash
grep -rhoE "@Entity\((\{ *name: *)?['\"][^'\"]+" src/module \
  | sed -E "s/.*['\"]//" | sort | uniq -d
```

No output means no duplicates.

#### Entity Naming Conventions

**Rule**: the table name passed to `@Entity()` MUST start with the module name in PascalCase:

| Module          | Examples                                 |
| --------------- | ---------------------------------------- |
| `identity`      | `IdentityUserAuth`, `IdentitySession`    |
| `user-profile`  | `UserProfileUser`, `UserProfileAddress`  |
| `catalog`       | `CatalogEvent`, `CatalogArtist`          |
| `ticketing`     | `TicketingOrder`, `TicketingSeatHold`    |
| `billing`       | `BillingPayment`, `BillingRefund`        |
| `social-proof`  | `SocialProofTestimonial`                 |
| `notifications` | `NotificationsNotification`              |

Class names can stay short (`export class Order`) because they never leave the module. Never use a bare generic table name like `User`, `Order`, or `Event`.

### 9. Observability

Each module gives individual visibility into its behavior.

- ✅ **DO**: log with a context name per class, so every line identifies its module
- ✅ **DO**: include identifiers (`orderId`, `eventId`) and the operation in log messages
- ❌ **DON'T**: mix module concerns in one logger

```typescript
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async markPaid(orderId: string) {
    this.logger.log(`Marking order ${orderId} as paid`);
    // ...
  }
}
```

**Future (not set up yet)**: per-module health indicators, metrics, dashboards, and alerts. `@nestjs/terminus` isn't installed. Don't add these unless a task asks for them.

### 10. Fail Independence

A failure in one module doesn't cascade to others.

- ✅ **DO**: use timeouts and retries for external calls
- ✅ **DO**: degrade gracefully when a non-critical dependency fails
- ✅ **DO**: prefer async (queues) for work that isn't needed to answer the request, so a failure there can't fail the request. For example, a notification email must never fail a checkout.
- ❌ **DON'T**: let one module's failure bring down others
- ❌ **DON'T**: chain synchronous calls across modules when an event would do

```typescript
// Graceful degradation around a non-critical external call
async findEventDetails(eventId: string) {
  const event = await this.eventRepository.findOneById(eventId);

  const weather = await this.weatherClient
    .forecast(event.city, event.startAt)
    .catch((error: HttpClientException) => {
      this.logger.warn(`Weather unavailable for event ${eventId}: ${error.message}`);
      return null;
    });

  return { event, weather };
}
```

**Future (not set up yet)**: circuit breakers between modules. They matter once modules are extracted and talk over the network.

---

## Repository Pattern & ORM Encapsulation

Repositories MUST encapsulate all ORM-specific logic and never expose TypeORM APIs to the rest of the module.

- ✅ **DO**: extend `DefaultTypeOrmRepository<Entity>` for every repository
- ✅ **DO**: inject the module's named DataSource with `@InjectDataSource('<module>')`
- ✅ **DO**: pass `dataSource.manager` to `super()`
- ✅ **DO**: add query methods with business meaning (`findUpcomingByArtist`, `findByEvent`)
- ✅ **DO**: use the query builder or raw SQL *inside* repository methods when `find` options aren't enough
- ❌ **DON'T**: extend TypeORM's `Repository` class or use `@InjectRepository`
- ❌ **DON'T**: expose the query builder, `EntityManager`, or raw query methods to services
- ❌ **DON'T**: use `dataSource.createEntityManager()` in constructors

`DefaultTypeOrmRepository` (`src/module/shared/module/persistence/typeorm/repository/default-typeorm.repository.ts`) wraps TypeORM's `Repository` as a private property (composition over inheritance) and exposes only a controlled set of methods. The file is the source of truth for that set. This:

- prevents services from coupling to ORM internals
- makes repositories easy to mock
- forces complex queries into named methods

```typescript
// ✅ GOOD (existing code)
// src/module/catalog/persistence/repository/ticket-type.repository.ts
@Injectable()
export class TicketTypeRepository extends DefaultTypeOrmRepository<TicketType> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(TicketType, datasource.manager);
  }

  async findByEvent(eventId: string): Promise<TicketType[]> {
    return this.entityManager
      .createQueryBuilder(TicketType, 'ticketType')
      .where('ticketType.eventId = :eventId', { eventId })
      .orderBy('ticketType.priceCents', 'DESC')
      .addOrderBy('ticketType.name', 'ASC')
      .getMany();
  }
}

// ❌ BAD: extending TypeORM's Repository exposes query(), increment(), createQueryBuilder()...
@Injectable()
export class TicketTypeRepository extends Repository<TicketType> {}

// ❌ BAD: service coupled to TypeORM
async listTicketTypes(eventId: string) {
  return this.dataSource
    .createQueryBuilder(TicketType, 't')
    .where('t.eventId = :eventId', { eventId })
    .getMany();
}
```

**Named DataSource injection**: always name it. The default (unnamed) DataSource is ambiguous when every module has its own.

---

## Lean Resolvers & Controllers

Resolvers (GraphQL) and controllers (REST) MUST only handle transport. Business logic, orchestration, and data access live in services and use cases.

- ✅ **DO**: keep each method under ~20 lines
- ✅ **DO**: call services or use cases, never repositories
- ✅ **DO**: handle only argument parsing, user context, one service call, and result mapping
- ❌ **DON'T**: put business rules, calculations, or aggregation in resolvers/controllers
- ❌ **DON'T**: handle entity relationships in resolvers/controllers

Why: fat resolvers make business logic untestable without a GraphQL request, duplicate logic across queries/mutations, and block reuse from queues or other entry points.

**Resolver/controller responsibilities (only these):**

1. Read arguments (`@Args` input types, or body/params/query for REST)
2. Rely on `ValidationPipe` + `class-validator` for input validation
3. Read user context from `ClsService` (`userId` and `sessionId`, set by `AuthGuard`)
4. Call one service or use case method with plain values
5. Return a GraphQL `@ObjectType` (or a response DTO for REST)
6. Let domain exceptions surface as GraphQL/HTTP errors

```typescript
// ✅ GOOD (existing code)
// src/module/catalog/http/graphql/catalog.resolver.ts
@Query(() => FindArtist)
async findArtistBySlug(@Args('FindArtistInput') { slug }: FindArtistInput) {
  return this.catalogService.findArtistBySlug({ slug });
}

// ✅ GOOD: protected mutation
@Mutation(() => OrderType)
@UseGuards(AuthGuard)
async checkout(@Args('CheckoutInput') input: CheckoutInput): Promise<OrderType> {
  return this.checkoutUseCase.execute({
    userId: this.clsService.get('userId'),
    eventId: input.eventId,
    items: input.items,
  });
}

// ❌ BAD: repository access and pricing rules in the resolver
@Mutation(() => OrderType)
async checkout(@Args('CheckoutInput') input: CheckoutInput) {
  const ticketTypes = await this.ticketTypeRepository.findByEvent(input.eventId);
  let total = 0;
  for (const item of input.items) {
    const ticketType = ticketTypes.find((t) => t.id === item.ticketTypeId);
    total += ticketType.priceCents * item.quantity + FEE_CENTS; // business rule
  }
  // ...
}
```

| Responsibility                     | Service / Use case | Resolver / Controller |
| ---------------------------------- | ------------------ | --------------------- |
| Business logic                     | ✅                 | ❌                    |
| Domain validation                  | ✅                 | ❌                    |
| Repository calls                   | ✅                 | ❌                    |
| Calculations                       | ✅                 | ❌                    |
| Orchestration                      | ✅                 | ❌                    |
| Entity relationships               | ✅                 | ❌                    |
| Input validation (input types/DTO) | ❌                 | ✅                    |
| HTTP status codes (REST)           | ❌                 | ✅                    |
| Result mapping (→ GraphQL type)    | ❌                 | ✅                    |
| User context extraction            | ❌                 | ✅                    |

---

## Transaction Management & Named Connections

Service or use case methods that write to the database MUST use `@Transactional()` from `typeorm-transactional`, with an explicit `connectionName`.

- ✅ **DO**: add `@Transactional({ connectionName: '<module>' })` to public methods that write
- ✅ **DO**: use it for read-then-write flows (prevents race conditions) and multi-write flows (all-or-nothing)
- ❌ **DON'T**: use `@Transactional()` without `connectionName`; every module has its own DataSource
- ❌ **DON'T**: nest `@Transactional()` methods (call non-transactional methods from a transactional one)
- ❌ **DON'T**: add it to read-only methods
- ❌ **DON'T**: expect one transaction to cover two modules; they use different connections
- ❌ **DON'T**: run a repository's raw `this.entityManager.createQueryBuilder()...execute()` against a row inserted earlier in the same still-open `@Transactional` method and expect it to see that row. `typeorm-transactional` patches `Repository` methods (`.save()`, `.find()`, ...) to resolve the ambient transactional connection per call, but a raw query builder built from the `EntityManager` captured once in `DefaultTypeOrmRepository`'s constructor resolves its own pooled connection instead, so it can't see an uncommitted row from the current transaction. It silently matches 0 rows rather than throwing. Found in `identity`'s `VerificationCodeRepository.invalidateLive`: superseding an already-committed code (an earlier transaction) works; invalidating a code inserted earlier in the *same* transaction does not. Fix by mutating and `.save()`-ing the entity you already have in memory instead of a second raw query against the same transaction.

```typescript
// ✅ Multiple writes: all succeed or all roll back
// src/module/ticketing/core/service/order.service.ts
@Injectable()
export class OrderService {
  @Transactional({ connectionName: 'ticketing' })
  async createPending(userId: string, event: PublishedEventSummary, items: CheckoutItem[]) {
    const order = await this.orderRepository.save(
      new Order({ userId, eventId: event.id, eventName: event.name, status: OrderStatus.PENDING }),
    );

    for (const item of items) {
      await this.orderItemRepository.save(new OrderItem({ orderId: order.id, ...item }));
    }

    return order;
  }

  // ❌ Read-only: no transaction
  async findById(id: string) {
    return this.orderRepository.findOneById(id);
  }
}
```

### Connection Names

| Module          | `connectionName`  |
| --------------- | ----------------- |
| `identity`      | `'identity'`      |
| `user-profile`  | `'user-profile'`  |
| `catalog`       | `'catalog'`       |
| `ticketing`     | `'ticketing'`     |
| `billing`       | `'billing'`       |
| `social-proof`  | `'social-proof'`  |
| `notifications` | `'notifications'` |

### Setup Requirements

`initializeTransactionalContext()` is already called in `src/main.ts` and in `createNestApp()` (`test/test-e2e.setup.ts`). Each persistence module must also register its DataSource with `addTransactionalDataSource`, under the same name used in `connectionName`:

```typescript
// src/module/ticketing/persistence/ticketing-persistence.module.ts
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';

@Module({
  imports: [
    TypeOrmPersistenceModule.forRoot({
      name: 'ticketing',
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        dataSourceOptionsFactory(configService),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        return addTransactionalDataSource({
          name: options.name, // must match connectionName in @Transactional
          dataSource: new DataSource(options),
        });
      },
    }),
  ],
  providers: [OrderRepository, OrderItemRepository],
  exports: [OrderRepository, OrderItemRepository],
})
export class TicketingPersistenceModule {}
```

---

## Inter-Module Communication Patterns

### Option 1: Public API Provider (synchronous calls)

Use when a module needs an answer now (e.g. Ticketing checks that an event is on sale).

1. Define the interface and `Symbol` token in `src/module/shared/module/integration/interface/{module}-integration.interface.ts`.
2. Implement it in the owning module's `integration/provider/public-api.provider.ts`, delegating to its services.
3. Register `{ provide: Token, useClass: Provider }` in the owning module and export only the token.
4. The consuming module imports the owning module and injects the token with `@Inject(Token)`.

See [§5](#5-explicit-communication) for the code.

### Option 2: BullMQ Jobs (asynchronous events)

Use when other modules should react to something that already happened (e.g. payment succeeded → issue tickets, send email).

```typescript
// Producer, in Billing
// src/module/billing/queue/producer/payment-events.queue-producer.ts
@Injectable()
export class PaymentEventsQueueProducer {
  constructor(
    @InjectQueue(BILLING_EVENT_QUEUES.TICKETING_PAYMENT_SUCCEEDED)
    private readonly ticketingQueue: Queue<PaymentSucceededJobData>,
    @InjectQueue(BILLING_EVENT_QUEUES.NOTIFICATIONS_PAYMENT_SUCCEEDED)
    private readonly notificationsQueue: Queue<PaymentSucceededJobData>,
  ) {}

  async publishPaymentSucceeded(data: PaymentSucceededJobData): Promise<void> {
    await Promise.all([
      this.ticketingQueue.add('payment.succeeded', data),
      this.notificationsQueue.add('payment.succeeded', data),
    ]);
  }
}

// Consumer, in Ticketing
// src/module/ticketing/queue/consumer/payment-succeeded.queue-consumer.ts
@Processor(BILLING_EVENT_QUEUES.TICKETING_PAYMENT_SUCCEEDED)
export class PaymentSucceededQueueConsumer extends WorkerHost {
  constructor(private readonly ticketIssuingService: TicketIssuingService) {
    super();
  }

  async process(job: Job<PaymentSucceededJobData>): Promise<void> {
    // Idempotent: issuing tickets for an already-issued order is a no-op
    await this.ticketIssuingService.issueForOrder(job.data.orderId);
  }
}
```

Publish after the producing transaction commits. If the job is added inside the transaction and the transaction rolls back, consumers act on something that never happened.

### Option 3: HTTP Client (after extraction)

When a module is extracted to its own service, its consumers keep the same contract and swap the provider for an HTTP client in `http/client/` (see [§2](#2-composability)).

---

## Testing Module Independence

### E2E Tests per Module

```typescript
// Condensed from src/module/catalog/__test__/e2e/catalog/event-tickets.spec.ts (existing code)
describe('CatalogResolver findEventTickets (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    const nestTestSetup = await createNestApp([CatalogModule]); // only this module
    module = nestTestSetup.module;
    app = nestTestSetup.app;
  });

  beforeEach(async () => {
    await testDbClient(Tables.TicketType).del();
    await testDbClient(Tables.Event).del();
  });

  afterAll(async () => {
    await testDbClient.destroy();
    const dataSource = module.get<DataSource>(getDataSourceToken('catalog'));
    if (dataSource.isInitialized) await dataSource.destroy();
    await app.getHttpServer().close();
  });

  it('returns ticket types for a published event', async () => {
    const event = eventFactory.build({ status: EventStatus.PUBLISHED });
    await testDbClient(Tables.Event).insert(event);
    await testDbClient(Tables.TicketType).insert(
      ticketTypeFactory.build({ eventId: event.id }),
    );

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: FIND_EVENT_TICKETS, variables: { /* ... */ } });

    expect(res.body.data.findEventTickets.ticketTypes).toHaveLength(1);
  });
});
```

When a module depends on another module's contract, provide a fake for the token instead of importing the real module:

```typescript
const catalogEventApiFake: CatalogEventApi = {
  findPublishedEvent: async (id) => ({ id, name: 'Show', startAt: new Date(), venue: 'Arena' }),
};

const moduleRef = await Test.createTestingModule({ imports: [TicketingModule] })
  .overrideProvider(CatalogEventApi)
  .useValue(catalogEventApiFake)
  .compile();
```

### Unit Tests with Mocked Dependencies

Services and use cases can be unit-tested with mocked repositories via `Test.createTestingModule({ providers: [...] })`. There's no folder for unit tests in `.projectStructurerc.json` or `test/jest.e2e.ts` yet; add both before writing the first one.

---

## Implementation Checklist

### Module Structure

- [ ] Module folder listed in `.projectStructurerc.json`
- [ ] `core/`, `http/`, `persistence/` layers created
- [ ] `{module}.module.ts` imported in `AppModule`
- [ ] Path alias in `tsconfig.json` and `test/jest.shared.ts`

### State Isolation

- [ ] Named DataSource for the module
- [ ] Own `migrationsTableName` and migration scripts
- [ ] Module-prefixed table names
- [ ] No duplicate table names (run the check in [§8](#critical-violation-duplicate-table-names))
- [ ] No FKs, relations, or joins to other modules' tables

### Repository Pattern

- [ ] Repositories extend `DefaultTypeOrmRepository`
- [ ] `@InjectDataSource('<module>')` in every repository
- [ ] Complex queries live in named repository methods

### Services

- [ ] Business logic in services / use cases
- [ ] `@Transactional({ connectionName })` on write methods
- [ ] DataSource registered with `addTransactionalDataSource`
- [ ] No imports of other modules' internals

### Resolvers & Controllers

- [ ] Methods under ~20 lines
- [ ] Inject services or use cases only
- [ ] Input types / DTOs with `class-validator`
- [ ] User context from `ClsService`

### Public API

- [ ] Contract interface + `Symbol` token in `shared/module/integration/`
- [ ] `public-api.provider.ts` implements it
- [ ] Module exports only the token

### Testing

- [ ] E2E tests boot only this module
- [ ] Factories for the module's tables
- [ ] Tables added to `test/enum/table.enum.ts`

### Validation

- [ ] `pnpm --filter api lint:check` passes (structure + lint)
- [ ] Duplicate table name check passes
- [ ] Module tests pass on their own

### Future (only when a task asks for it)

- [ ] Per-module health indicator (`@nestjs/terminus`)
- [ ] Metrics, dashboards, and alerts
- [ ] Circuit breakers between modules

---

## Anti-Patterns to Avoid

| Anti-pattern                                            | Instead                                                   | See                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Importing another module's service, entity, or type     | Inject its contract token                                 | [§1](#1-well-defined-boundaries), [§5](#5-explicit-communication)    |
| FK / `@ManyToOne` to another module's entity            | Plain `uuid` column + replicated fields                   | [§8](#8-state-isolation)                                             |
| Generic or duplicate table names (`User`, `Order`)      | Module-prefixed names (`TicketingOrder`)                  | [§8](#entity-naming-conventions)                                     |
| Fat resolvers/controllers                               | Delegate to one service or use case                       | [Lean Resolvers](#lean-resolvers--controllers)                       |
| Multiple writes without a transaction                   | `@Transactional({ connectionName })`                      | [Transactions](#transaction-management--named-connections)           |
| Extending TypeORM `Repository` / query builder in services | `DefaultTypeOrmRepository` + named methods             | [Repository Pattern](#repository-pattern--orm-encapsulation)         |
| Synchronous cross-module chains for side effects        | BullMQ jobs                                               | [Communication Patterns](#inter-module-communication-patterns)       |
