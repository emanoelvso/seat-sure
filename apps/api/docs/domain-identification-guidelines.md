# Domain and Subdomain Identification Guidelines

## Purpose

How to analyze Seat Sure's code and planned model to identify:

- **Domains** and **subdomains**, following DDD strategic design ([ddd-strategic-design-theory.md](./ddd-strategic-design-theory.md))
- **Low cohesion** between concepts
- **Cohesion maps** showing how domains and subdomains relate

This analysis is **strategic** (problem space). It identifies _what_ domains exist, not _how_ to structure modules; for that, see [modular-architecture-principles.md](./modular-architecture-principles.md), [architecture-guidelines.md](./architecture-guidelines.md), and [feature-folders-guidelines.md](./feature-folders-guidelines.md).

A worked example on the Catalog module is in [domain-identification-example.md](./domain-identification-example.md).

### When to Use It

- A new concept doesn't obviously belong to one module (like `TicketType` before [ADR-011](../../../docs/adrs/011-catalog-owns-ticket-types-and-seat-maps.md))
- Revisiting the contexts in [`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md)
- A module is growing and you need its subdomains to decide on feature folders
- Auditing cohesion and cross-module coupling

### Where Results Go

- Report the analysis in the conversation, using the [Output Format](#output-format). Don't write it to a file unless asked.
- Findings that need code changes go on the [project board](https://github.com/users/emanoelvso/projects/3) as issues. Don't fix them as a side effect.
- Changes to the contexts themselves (a new context, a concept moving between contexts, a new subdomain type) go into `bounded-contexts.md` or a new ADR, only after the project owner agrees.

---

## Core DDD Strategic Design Principles

### 1. Domain vs Subdomain

- **Domain**: the entire business area the organization operates in (for Seat Sure: selling tickets for live events)
- **Subdomain**: a distinct area of business functionality within the domain
  - **Core Domain**: the primary business differentiator (highest priority)
  - **Supporting Subdomain**: essential but not differentiating (specialized to the business)
  - **Generic Subdomain**: common functionality, not business-specific

### 2. Bounded Context

- A **linguistic boundary** where domain terms have explicit, unambiguous meaning
- Each bounded context has its own **Ubiquitous Language**
- Concepts can share a name and still mean different things across contexts ("seat" in Catalog vs Ticketing)

### 3. Problem Space vs Solution Space

- **Problem space**: business challenges and required capabilities (subdomains)
- **Solution space**: the technical implementation (bounded contexts → modules in `src/module/`)
- **Goal**: one subdomain per bounded context when possible

---

## Sources in Seat Sure

Most contexts exist only on paper, so analyze the plan as well as the code:

| Source                                     | What it gives you                                                  |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `src/module/*/` (code)                     | Entities, services, use cases, resolvers, controllers, consumers   |
| `docs/architecture/bounded-contexts.md`    | Planned contexts, their tables, and the feature → context mapping  |
| `docs/architecture/entities.mmd`           | Planned entity relationships                                       |
| `docs/adrs/`                               | Decisions that moved concepts between contexts (e.g. ADR-011)      |
| `.specs/features/*/spec.md`                | Business vocabulary as used in feature specs                       |
| `git log`                                  | Change cohesion (which files change together)                      |

---

## Identification Process

### Step 1: Extract Concepts from Code

Paths are relative to `apps/api/`.

1. **Entities** (classes with identity)
   - Look for: `@Entity` in `*/persistence/entity/*.entity.ts`, domain models in `*/core/model/*.model.ts`
   - Focus on: business concepts, not technical infrastructure (`DefaultEntity`)

2. **Services** (business operations)
   - Look for: `*/core/service/*.service.ts`, plus the query method names in `*/persistence/repository/*.repository.ts` (`findUpcomingByArtist` says more about the language than the service does)
   - Focus on: business logic, not technical utilities

3. **Use cases** (business workflows)
   - Look for: `*/core/use-case/*.use-case.ts`
   - Focus on: business processes, not CRUD

4. **Entry points**
   - Look for: `@Query` / `@Mutation` in `*/http/graphql/*.resolver.ts`, `*/http/rest/controller/*.controller.ts`, `*/queue/consumer/*.queue-consumer.ts`
   - Focus on: the business capabilities exposed, not the transport

### Step 2: Group Concepts by Ubiquitous Language

For each concept, identify:

1. **Primary language context**
   - Which business language does it belong to?
   - Example: `Order`, `SeatHold`, `Ticket` → Ticketing language
   - Example: `Event`, `Artist`, `SeatMap` → Catalog language

2. **Concept relationships**
   - Which concepts naturally belong together?
   - Which concepts reference each other?
   - Which concepts share the same vocabulary?

3. **Linguistic boundaries**
   - Where does a term's meaning change?
   - Example: `User` in Identity & Access (credentials) vs the buyer in Ticketing (`userId` on an order)

### Step 3: Identify Domains

A **domain** is identified by:

- **Distinct business capability**: a major business function
- **Independent business value**: it can be understood on its own
- **Unique vocabulary**: it has its own terminology

**Indicators of a domain:**

- ✅ Several related entities working together
- ✅ Services that operate on a cohesive set of concepts
- ✅ Use cases that solve a specific business problem
- ✅ Resolvers or controllers that expose a distinct business capability

**Seat Sure's planned contexts** (from `bounded-contexts.md`):

- **Identity & Access**: sign-up, login, credentials, sessions, roles
- **User Profile**: personal info, language, preferences, addresses
- **Catalog**: events, artists, venues, seat maps (and ticket types, per ADR-011)
- **Ticketing**: seat holds, orders, tickets, ticket status
- **Billing**: payment methods, payments, refunds
- **Social Proof**: testimonials and reviews
- **Notifications**: in-app and email messages, templates, delivery log

### Step 4: Identify Subdomains

A **subdomain** is identified by:

- **Focused business function**: one specific aspect within a domain
- **Distinct responsibilities**: different from other subdomains
- **Separate lifecycle**: it can evolve independently

**Types of subdomains:**

#### Core Domain

- **Indicators:**
  - Highest business value
  - Competitive advantage
  - Complex business logic
  - Requires domain experts
  - Changes often

#### Supporting Subdomain

- **Indicators:**
  - Essential but not differentiating
  - Business-specific (not generic)
  - Supports the Core Domain
  - Moderate complexity

#### Generic Subdomain

- **Indicators:**
  - Common functionality
  - Could be bought or outsourced
  - Well-understood problem
  - Low business differentiation

**Example: Catalog domain**

- **Core**: choosing a section on the venue's seat map, with its price and availability
- **Supporting**: artist pages and "similar concerts" (business-specific, not a differentiator)
- **Generic**: geocoding venues for "events near you" (could be a maps API or PostGIS)

### Step 5: Measure Cohesion

Cohesion measures how closely related the concepts in a domain or subdomain are.

#### High Cohesion Indicators ✅

- Concepts share the same Ubiquitous Language
- Concepts are often used together
- Concepts have direct business relationships
- Changing one concept affects others in the same group
- Concepts solve the same business problem

#### Low Cohesion Indicators ❌

- Concepts from different business vocabularies mixed together
- Concepts rarely used together
- No direct business relationship between concepts
- Changing one concept doesn't affect the others
- Concepts solve different business problems

#### Cohesion Metrics

1. **Linguistic cohesion**
   - Count the terms shared in the Ubiquitous Language
   - More shared vocabulary = higher cohesion

2. **Usage cohesion**
   - Analyze method calls, dependencies, and imports
   - Concepts used together often = higher cohesion

3. **Data cohesion**
   - Analyze TypeORM relations and foreign keys
   - Direct relationships = higher cohesion
   - Across modules there are no FKs by design ([ADR-006](../../../docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md)); a plain `uuid` reference counts as a weak data link

4. **Change cohesion**
   - Analyze git history for co-changes
   - Files changed together = higher cohesion

---

## Low Cohesion Detection Rules

### Rule 1: Linguistic Mismatch

**Problem**: concepts use different business vocabularies.

**Detection**:

- `User` credentials (identity) mixed with `Order` (ticketing)
- Seat availability (`free | held | sold`, ticketing) as a column on Catalog's `Seat`
- `Payment` (billing) fields on `Event` (catalog)

**Action**: flag as low cohesion, suggest separation.

### Rule 2: Cross-Domain Dependencies

**Problem**: concepts from different domains are tightly coupled.

**Detection**:

- A service in module A instantiates or queries module B's entities
- A service in module A holds business logic that belongs to module B
- A resolver or controller handles concepts from several domains
- Imports from another module's internals (`@catalogModule/...` inside `src/module/ticketing/`)

**Action**: flag as low cohesion, suggest contract-based integration ([modular-architecture-principles.md §5](./modular-architecture-principles.md#5-explicit-communication)).

### Rule 3: Mixed Responsibilities

**Problem**: one class or service handles several business concerns.

**Detection**:

- A service that handles both event listings and ticket sales
- An entity that represents several business concepts
- A use case that orchestrates several domains without going through their contracts

**Action**: flag as low cohesion, suggest splitting.

### Rule 4: Generic Concepts in Core Domain

**Problem**: generic functionality mixed with core business logic.

**Detection**:

- Authentication logic in Ticketing
- Email sending in `OrderService` (belongs to Notifications, triggered by a job)
- Stripe SDK calls in a Ticketing service (belongs to Billing, behind an adapter)
- File storage in a Catalog service

**Action**: flag as low cohesion, suggest extracting to a Generic subdomain.

### Rule 5: Unclear Boundaries

**Problem**: you can't tell which domain a concept belongs to.

**Detection**:

- A concept used in several contexts with different meanings
- A service that could belong to several domains
- An entity with relationships to several domains
- Two models of the same concept inside one context

**Action**: flag as low cohesion, suggest clarifying the boundary.

---

## Cohesion Map Structure

### Domain Cohesion Map

```
Domain: Ticketing (planned)
├── Subdomain: Seat Reservation (Core)
│   ├── Concepts: SeatHold, seat availability
│   ├── Cohesion: High (9/10)
│   └── Dependencies: → Catalog (seatId, ticketTypeId), → User Profile (userId)
│
├── Subdomain: Ordering (Core)
│   ├── Concepts: Order, OrderItem, OrderStatus
│   ├── Cohesion: High (8/10)
│   └── Dependencies: → Seat Reservation, → Billing (payment result)
│
└── Subdomain: Ticket Issuing (Supporting)
    ├── Concepts: Ticket, ticket code (QR), TicketStatus
    ├── Cohesion: High (8/10)
    └── Dependencies: → Ordering
```

### Cross-Domain Cohesion Map

```
Ticketing Domain
├── High Cohesion (9/10)
│   └── SeatHold, Order, Ticket
│
├── Medium Cohesion (6/10)
│   └── Order.eventName (ticketing) ↔ Event (catalog) [replicated at checkout]
│
└── Low Cohesion (2/10)
    └── Ticketing service importing CatalogService [should use CatalogEventApi]
```

### Cohesion Score Calculation

```
Cohesion Score (0-10) =
  Linguistic Cohesion (0-3) +
  Usage Cohesion (0-3) +
  Data Cohesion (0-2) +
  Change Cohesion (0-2)

- 8-10: High Cohesion ✅
- 5-7: Medium Cohesion ⚠️
- 0-4: Low Cohesion ❌
```

Show the four parts next to each score, so the reader can check the reasoning.

---

## Analysis Checklist

### For Each Concept Found

- [ ] Which business language does it belong to?
- [ ] Which domain does it belong to?
- [ ] Which subdomain does it belong to?
- [ ] Is it Core, Supporting, or Generic?
- [ ] Which other concepts does it relate to?
- [ ] Which concepts does it depend on?
- [ ] Are its dependencies inside the same domain?
- [ ] Are there linguistic mismatches?

### For Each Domain Identified

- [ ] What is the Ubiquitous Language?
- [ ] What are the key concepts?
- [ ] What are the subdomains?
- [ ] What is the Core Domain?
- [ ] What are the dependencies on other domains?
- [ ] Is cohesion high within the domain?
- [ ] Are the boundaries clear?
- [ ] Does it match `bounded-contexts.md` and the ADRs? If not, is the difference documented?

### For Cohesion Analysis

- [ ] Calculate cohesion scores for each group
- [ ] Identify low cohesion areas
- [ ] Map dependencies between domains
- [ ] Identify linguistic mismatches
- [ ] Flag cross-domain tight coupling
- [ ] Suggest boundary clarifications

---

## Output Format

### Domain Map

```markdown
## Domain: {Domain Name}

**Type**: Core Domain | Supporting Subdomain | Generic Subdomain

**Ubiquitous Language**: {key terms}

**Concepts**:

- {Concept1} (Entity/Service/UseCase/Resolver)
- {Concept2} (Entity/Service/UseCase/Resolver)
- ...

**Subdomains**:

1. {Subdomain1} (Core/Supporting/Generic)
   - Concepts: {list}
   - Cohesion: {score}/10 (L{n} U{n} D{n} C{n})

2. {Subdomain2} (Core/Supporting/Generic)
   - Concepts: {list}
   - Cohesion: {score}/10 (L{n} U{n} D{n} C{n})

**Dependencies**:

- → {OtherDomain} (via {contract/concept})
- ← {OtherDomain} (via {contract/concept})

**Cohesion Issues**:

- ❌ {Issue description}
- ⚠️ {Warning description}
```

### Cohesion Matrix

```markdown
## Cohesion Matrix

| Domain A  | Domain B     | Cohesion | Relationship Type                    |
| --------- | ------------ | -------- | ------------------------------------ |
| Ticketing | Catalog      | 6/10     | Medium - reads events via public API |
| Ticketing | Billing      | 6/10     | Medium - payment result via job      |
| Ticketing | User Profile | 3/10     | Low - userId reference only          |
```

### Low Cohesion Report

```markdown
## Low Cohesion Issues

### Issue #1: Linguistic Mismatch

**Location**: {file/class}
**Problem**: {description}
**Concepts Involved**: {list}
**Suggested Fix**: {recommendation}

### Issue #2: Cross-Domain Coupling

**Location**: {file/class}
**Problem**: {description}
**Concepts Involved**: {list}
**Suggested Fix**: {recommendation}
```

---

## Examples

### Example 1: Identifying the Ticketing Domain

**Planned concepts** (from `bounded-contexts.md`; no code yet):

```
Entities:  Order, OrderItem, SeatHold, Ticket
Services:  SeatHoldService, OrderService, TicketIssuingService
Use cases: CheckoutUseCase
Consumers: PaymentSucceededQueueConsumer, SeatHoldExpirationQueueConsumer
```

**Analysis**:

- **Ubiquitous Language**: order, item, hold, expiry, checkout, ticket, code, issued, used
- **Domain**: Ticketing
- **Subdomains**:
  - Seat Reservation (Core)
  - Ordering (Core)
  - Ticket Issuing (Supporting)
- **Cohesion**: High (8/10). All concepts share the "buying a seat" vocabulary.

### Example 2: Low Cohesion Detection

**Code found**:

```typescript
// src/module/ticketing/core/service/seat-hold.service.ts
@Injectable()
export class SeatHoldService {
  constructor(
    private readonly seatHoldRepository: SeatHoldRepository,
    private readonly catalogService: CatalogService, // Catalog internals
  ) {}

  async hold(userId: string, eventId: string, seatIds: string[]) {
    const { event } = await this.catalogService.findEventTickets({ eventId });
    // ...
  }
}
```

**Analysis**:

- **Problem**: Ticketing depends directly on Catalog's internal service
- **Rule**: Cross-Domain Dependencies (Rule 2)
- **Cohesion**: Low (2/10)
- **Suggested fix**: inject the `CatalogEventApi` contract from `src/module/shared/module/integration/` instead of `CatalogService` ([modular-architecture-principles.md §3](./modular-architecture-principles.md#3-independence))

### Example 3: Catalog Domain with Subdomains (existing code)

**Code found**:

```
Entities:  Event, EventArtist, Artist, Venue, SeatMap, TicketType
Services:  CatalogService (createEvent, getHomeSections, findEvents,
           findArtistBySlug, findEventTickets)
Resolvers: CatalogResolver (same five operations)
```

**Analysis**:

- **Domain**: Catalog
- **Subdomains**:
  - Event Discovery (Core): Event, createEvent, getHomeSections, findEvents
  - Artists (Supporting): Artist, EventArtist, findArtistBySlug
  - Venues & Seat Maps (Supporting): Venue, SeatMap
  - Ticket Types (Core): TicketType, findEventTickets
- **Cohesion**:
  - Within subdomains: High (8-9/10)
  - Between subdomains: Medium, which is expected inside one context
  - One service spans all four subdomains (Rule 3)

The full analysis is in [domain-identification-example.md](./domain-identification-example.md).

---

## Key Principles to Remember

1. **Focus on business language, not code structure**
   - Don't group by technical layers (resolvers, services)
   - Group by business meaning and vocabulary

2. **Ubiquitous Language is the primary guide**
   - Different business terms → likely different domains
   - Shared business vocabulary → likely the same domain or subdomain

3. **Cohesion is about business relationships**
   - High cohesion = concepts solve the same business problem
   - Low cohesion = concepts solve different business problems

4. **Dependencies must be explicit**
   - Cross-domain dependencies go through contracts (public API providers, BullMQ jobs)
   - Direct imports between modules indicate low cohesion

5. **Subdomains can have different cohesion levels**
   - The Core Domain should have high cohesion
   - Generic subdomains may have lower cohesion (they're often utilities)

6. **Don't over-optimize**
   - Some cross-domain communication is necessary
   - Aim for clear boundaries, not zero dependencies

---

## Tools and Techniques

Commands run from `apps/api/`.

### Static Analysis

```bash
# Entities and their tables
grep -rn "@Entity(" src/module

# Relations (data cohesion)
grep -rnE "@(ManyToOne|OneToMany|OneToOne|ManyToMany)\(" src/module

# Imports of Catalog internals from outside Catalog (cross-domain coupling).
# app.module.ts importing catalog.module.ts is expected; anything else is a finding.
grep -rn "@catalogModule/" src --include='*.ts' | grep -v "^src/module/catalog/"

# Operations exposed per module
grep -rnE "@(Query|Mutation)\(" src/module
```

The duplicate table name check is in [modular-architecture-principles.md §8](./modular-architecture-principles.md#critical-violation-duplicate-table-names).

### Semantic Analysis

- Extract business terms from class, method, and repository query names
- Identify Ubiquitous Language patterns
- Group by vocabulary similarity

### Dependency Analysis

- Build the dependency graph from constructor injections and imports
- Identify tight coupling
- Find circular dependencies (`forwardRef()` is a red flag)

### Change Analysis

```bash
# Which entity files changed together, per commit
git log --format='--- %h %s' --name-only -- src/module/catalog/persistence/entity
```

### Output Artifacts

1. **Domain map**: domains and subdomains
2. **Cohesion matrix**: cohesion scores between domains
3. **Dependency graph**: relationships between concepts
4. **Low cohesion report**: issues with recommendations
5. **Ubiquitous Language dictionary**: terms per domain

---

## Validation Criteria

A good domain identification has:

- ✅ **Clear boundaries**: each domain has a distinct Ubiquitous Language
- ✅ **High internal cohesion**: concepts within a domain are closely related
- ✅ **Explicit dependencies**: cross-domain dependencies are clear
- ✅ **Business alignment**: domains match business capabilities
- ✅ **Actionable insights**: low cohesion issues have clear recommendations

---

## Notes

- This analysis is **strategic**, not tactical
- Focus on **what** domains exist, not **how** to implement them
- **Cohesion maps** help visualize relationships; they don't prescribe architecture
- **Low cohesion** doesn't always mean "bad"; it means "needs attention"
- A documented deviation (an ADR) is a known trade-off, not a new finding; mention it, but don't re-raise it as a problem

---

## References

- [ddd-strategic-design-theory.md](./ddd-strategic-design-theory.md): the theory behind these steps
- [domain-identification-example.md](./domain-identification-example.md): worked example on Catalog
- [modular-architecture-principles.md](./modular-architecture-principles.md): how contexts become isolated modules
- [feature-folders-guidelines.md](./feature-folders-guidelines.md): how subdomains become feature folders inside a module
- [`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md): Seat Sure's contexts
