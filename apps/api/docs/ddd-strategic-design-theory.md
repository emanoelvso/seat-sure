# DDD Strategic Design Theory

A condensed summary of Domain-Driven Design strategic design, with Seat Sure examples. It is the theory behind [domain-identification-guidelines.md](./domain-identification-guidelines.md) and the bounded contexts in [`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md).

- For how contexts become modules (boundaries, contracts, state isolation), see [modular-architecture-principles.md](./modular-architecture-principles.md).
- For how to organize code inside one module, see [feature-folders-guidelines.md](./feature-folders-guidelines.md).

## Core Definitions

### Domain

A **Domain** is what an organization does and the world it operates in.

- **Business definition**: the entire realm of business operations, know-how, and methods
- **Technical definition**: the problem space the software is built to address
- **Key insight**: "domain" is overloaded. It can mean the whole business domain or one specific area (Core Domain, Subdomain).

```
Domain = Organization's business realm + How it operates + Its unique knowledge
```

Seat Sure's domain is **selling tickets for live events**: people discover concerts, shows, sports, and festivals, pick a seat on the venue's map, pay, and get a ticket.

### Subdomain

A **Subdomain** is a distinct area within the overall business domain.

- **Purpose**: divide the complexity of the whole domain into manageable parts
- **Key insight**: every software domain has several subdomains, one per business function
- **Rule**: separate different business functions so complexity doesn't pile up in one place

```
Domain = Subdomain₁ + Subdomain₂ + Subdomain₃ + ... + Subdomainₙ
```

#### Types of Subdomains

| Type                     | Description                                                                | Business value | Team priority                   | Seat Sure example                                |
| ------------------------ | -------------------------------------------------------------------------- | -------------- | ------------------------------- | ------------------------------------------------ |
| **Core Domain**          | Primary importance to business success. Provides competitive advantage.    | Highest        | Best developers, domain experts | Ticketing: seat holds, orders, issued tickets    |
| **Supporting Subdomain** | Essential but not differentiating. Business-specific, supports Core.       | Medium         | Competent developers            | Billing: payments and refunds tied to orders     |
| **Generic Subdomain**    | Common functionality. Could be bought/outsourced. Well-understood problem. | Lower          | Can outsource                   | Notifications: email and in-app delivery         |

**Decision matrix for subdomain classification:**

```
Is it a competitive advantage?
  YES → Core Domain
  NO → Does it require business-specific knowledge?
         YES → Supporting Subdomain
         NO → Generic Subdomain
```

### Bounded Context

A **Bounded Context** is an explicit boundary within which a domain model exists.

- **Primary nature**: a **linguistic boundary** where terms have specific meanings
- **Key rule**: inside the boundary, every term of the Ubiquitous Language has one unambiguous meaning
- **Contains**: domain model, database schema (if designed for the model), application services, API (GraphQL resolvers, REST controllers)

> **Context is King**: the same term can mean completely different things in different contexts. In Seat Sure, a "seat" in Catalog is a fixed position on a venue's map; in Ticketing it is something that is free, held, or sold for one event.

```
Bounded Context = Explicit Linguistic Boundary + Domain Model + Supporting Infrastructure
```

In Seat Sure, each bounded context is one backend module under `src/module/{context}/` (see [architecture-guidelines.md](./architecture-guidelines.md#domain-modules)).

## Problem Space vs Solution Space

### Problem Space

- **Definition**: the parts of the Domain that need to be developed
- **Composition**: Core Domain + the Supporting Subdomains it needs
- **Purpose**: strategic assessment of business challenges
- **Tool**: Subdomains (quick view of the different parts)

### Solution Space

- **Definition**: the software models that realize the solution
- **Composition**: one or more Bounded Contexts
- **Purpose**: the actual implementation
- **Tool**: Bounded Contexts (specific software realization)

```
Problem Space (what to solve) → assessed using → Subdomains
                ↓ transforms into ↓
Solution Space (how to solve) → realized using → Bounded Contexts
```

**Ideal goal**: align Subdomains 1:1 with Bounded Contexts, so each domain model serves one business objective.

**Reality**: subdomains often cross context boundaries, or one context holds several implicit models.

In Seat Sure:

- **Problem space**: the "Feature → Context Mapping" table in [`bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md#feature--context-mapping)
- **Solution space**: the modules in `src/module/`, one per bounded context ([ADR-006](../../../docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md))
- **A known deviation**: ticket types (price, seats available, max per order) live in Catalog even though selling belongs to Ticketing ([ADR-011](../../../docs/adrs/011-catalog-owns-ticket-types-and-seat-maps.md)). It is deliberate and documented, and it should be revisited when Ticketing gets behavior.

## Ubiquitous Language

The **Ubiquitous Language** is the shared vocabulary between developers and domain experts.

### Key Principles

1. **Language drives boundaries**: bounded context boundaries are primarily linguistic
2. **Same term, different meaning**: when a term means different things, it belongs to different contexts
3. **No global definitions**: don't try to give every concept one global meaning
4. **Embrace differences**: use bounded contexts to make the differences explicit

### Linguistic Boundary Detection

**Signs that concepts belong to DIFFERENT bounded contexts:**

- The same term is used with different properties or behaviors
- The same term is used at different stages of a lifecycle
- Domain experts use different vocabulary for similar concepts
- Concepts have different relationships depending on context

**Example: "User" in Seat Sure**

| Context           | What "user" means                                        | Planned table / field                  |
| ----------------- | -------------------------------------------------------- | -------------------------------------- |
| Identity & Access | Credentials, sessions, roles                             | `users_auth`, `sessions`, `roles`      |
| User Profile      | Display name, avatar, language, addresses                | `users`, `user_preferences`            |
| Ticketing         | The buyer: who holds seats, places orders, owns tickets  | `userId` on orders, seat holds, tickets |
| Social Proof      | The author of a testimonial                              | `user_id` on testimonials              |

→ These are different concepts that share an identity (`userId`). Each context keeps only what it needs.

**Example: "Seat" across the purchase lifecycle**

| Stage                  | Context       | What "seat" means                                                    |
| ---------------------- | ------------- | -------------------------------------------------------------------- |
| Venue setup            | Catalog       | A position on a seat map: section, row, number, category, x/y        |
| Choosing a seat        | Ticketing     | Availability for one event: free, held, or sold                      |
| Checkout               | Ticketing     | A hold that locks the seat for one buyer until it expires            |
| After payment          | Ticketing     | The seat printed on an issued ticket, checked at the door            |
| Confirmation email     | Notifications | Text in a message payload ("Section B, row 4, seat 12")              |

→ Catalog's seat model and Ticketing's seat model are different, even though they share the seat's ID.

**Watch out for "event"**: in Seat Sure's language an event is a show (Catalog's `Event`). When talking about asynchronous messages, say "job" or name the fact that happened (`payment.succeeded`), so the two meanings don't blur.

## Strategic Design Anti-Patterns

### Big Ball of Mud

**Definition**: a haphazard, spaghetti-code system where everything is connected to everything else.

**Causes:**

- Mixing different business vocabularies in one model
- Not separating linguistic boundaries
- Blending Core Domain with Generic concerns
- No explicit bounded contexts

**Prevention:**

- Understand your Domain and Subdomains
- Create explicit bounded context boundaries (in Seat Sure: one module per context, enforced by [modular-architecture-principles.md](./modular-architecture-principles.md))
- Separate linguistic concerns

### All-Inclusive Model (Enterprise Model)

**Definition**: trying to build a single, cohesive model of the organization's whole business domain.

**Why it fails:**

- Global agreement on every concept's meaning is impossible
- Different stakeholders have different perspectives
- Lasting global definitions are unlikely
- It creates conflict and contention

**Solution**: accept that differences always exist, and use bounded contexts to delineate each model. For example, don't build one `User` entity that has credentials, preferences, orders, and testimonials.

### Mixed Linguistic Concepts

```
❌ WRONG: Testimonial, Rating, Approval coupled with User, Role
   - User/Role are identity and access concepts
   - Testimonial/Rating/Approval are social proof concepts
   - They don't belong to the same Ubiquitous Language

✅ CORRECT: Testimonial, Rating, Approval coupled with Author, Moderator
   - Every concept is part of the social proof language
   - Identity concepts stay in Identity & Access, referenced by userId
```

**Rule**: every concept in a bounded context must be linguistically tied to that context's domain.

## Size of Bounded Contexts

### Guiding Principle

> A bounded context should be as big as it needs to be to fully express its complete Ubiquitous Language.

### Mozart Principle

> "There are just as many notes as I required, neither more nor less."

- Not too small (gaping holes from missing concepts)
- Not too big (muddy waters from extraneous concepts)

### What to Include

- ✅ Concepts that are part of the Ubiquitous Language
- ✅ Concepts that domain experts describe as related
- ✅ Components that fit naturally in a cohesive model

### What to Exclude

- ❌ Concepts that aren't in your Ubiquitous Language
- ❌ Extraneous concepts that aren't really part of the context's domain
- ❌ Generic functionality that belongs in a Supporting or Generic subdomain

`bounded-contexts.md` applies this to venues and seats: they start inside Catalog, and become their own context only if seating gets complex (dynamic pricing, sections, holds).

### Wrong Reasons to Size Bounded Contexts

| Wrong reason                   | Why it's wrong                                                            |
| ------------------------------ | ------------------------------------------------------------------------- |
| Architectural components       | Technical components don't define linguistic boundaries                   |
| Developer task distribution    | Enforcing boundaries for task management ignores the linguistic reasons   |
| Platform/framework conventions | Infrastructure shouldn't drive domain boundaries                          |

**Alternative for task distribution**: split the code inside a context with feature folders ([feature-folders-guidelines.md](./feature-folders-guidelines.md)), not with new contexts.

## Integration Between Bounded Contexts

### Key Insights

1. **Bounded contexts rarely stand alone**: even large systems can't do everything
2. **Integration is necessary**: different models must work together
3. **Mapping is required**: integration means translating between contexts
4. **Shared identity, different models**: objects can share an ID across contexts and still have different properties

### Integration Example

```
Event (Catalog) + TicketType (Catalog)
           ↓ public API + translation ↓
Order with eventName snapshot (Ticketing)
```

- Ticketing asks Catalog's public API for a published event (`CatalogEventApi.findPublishedEvent`)
- The order stores `eventId` plus the fields it needs (`eventName`), copied at checkout
- The order is a different concept: it doesn't change when the event is renamed later
- The translation respects both contexts' languages

The mechanics (contracts in `src/module/shared/module/integration/`, plain `uuid` references, replicated fields, BullMQ jobs) are in [modular-architecture-principles.md](./modular-architecture-principles.md#5-explicit-communication).

## Assessment Questions

For Seat Sure, the current answers live in [`bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md) and [`docs/adrs/`](../../../docs/adrs/). Use these questions when revisiting them.

### Problem Space Assessment

1. What is the name of and vision for the strategic Core Domain?
2. What concepts should be considered part of the Core Domain?
3. What are the necessary Supporting and Generic Subdomains?
4. Who should do the work in each area of the domain?
5. Can the right teams be assembled?

### Solution Space Assessment

1. What software assets already exist, and can they be reused?
2. What assets need to be acquired or created?
3. How are they connected or integrated?
4. What additional integration will be needed?
5. Where are the terms of the Ubiquitous Languages completely different?
6. Where do bounded contexts overlap or share concepts?
7. How are shared terms mapped and translated between contexts?
8. Which bounded context holds the Core Domain concepts?

## Practical Application for Code Analysis

### Identifying Domains in Code

1. **Look for entity clusters**: groups of related entities with a shared vocabulary
2. **Analyze service responsibilities**: which business operations do they perform?
3. **Check use case scope**: which business problems do they solve?
4. **Examine resolver and controller groupings**: which capabilities do they expose?

### Detecting Wrong Boundaries

| Signal                                                         | Interpretation                                  |
| -------------------------------------------------------------- | ----------------------------------------------- |
| Same class used in several contexts with identical properties  | Potential modeling error (unless Shared Kernel) |
| Concepts with different vocabularies in the same module        | Mixed linguistic boundaries                     |
| Service handling several business domains                      | Low cohesion, should be split                   |
| Entity with relationships to unrelated domains                 | Unclear boundaries                              |

### Validating Correct Boundaries

| Signal                                                   | Interpretation              |
| -------------------------------------------------------- | --------------------------- |
| All concepts share a business vocabulary                 | Good linguistic cohesion    |
| Concepts have properties/operations specific to context  | Proper separation           |
| Clear integration points with other contexts             | Explicit boundaries         |
| Domain experts can describe concepts without confusion   | Healthy Ubiquitous Language |

## Key Takeaways

1. **Domain** = business realm. **Subdomain** = a specific business function within it.
2. **Bounded Context** = a linguistic boundary where terms have specific, unambiguous meanings. In Seat Sure, one per backend module.
3. **Ubiquitous Language** drives boundaries, not technical architecture.
4. **Core Domain** = competitive advantage. **Supporting** = essential but not differentiating. **Generic** = can be outsourced.
5. **Problem space** (subdomains) → **solution space** (bounded contexts).
6. **Anti-patterns**: Big Ball of Mud, All-Inclusive Model, Mixed Linguistic Concepts.
7. **Context size** comes from the completeness of the Ubiquitous Language, not from architecture or task distribution.
8. **Integration**: contexts must integrate, and integration needs mapping and translation.
9. **Same term, different context** = different concept = different bounded context.
10. **Ask domain experts** to understand linguistic boundaries. In Seat Sure, that's the project owner.
