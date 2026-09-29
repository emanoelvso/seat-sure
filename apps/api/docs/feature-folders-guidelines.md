# Feature Folders Guidelines

_Organizing a domain module as vertical slices_

- All paths are relative to `apps/api/`.
- **Status**: no Seat Sure module uses feature folders yet. Catalog is small enough for the standard layout ([When to Apply](#when-to-apply-feature-folders)).
- `.projectStructurerc.json` doesn't accept feature folders yet. Adding the rule is tracked in `todo.md` and must happen before the first module adopts them.
- Don't restructure an existing module into feature folders unless a task asks for it.

---

## TL;DR

```
✅ DO: Organize a large module by business features (event/, artist/, venue/)
❌ DON'T: Keep piling a large module into technical layers (core/service/, persistence/entity/)
❌ DON'T: Create a NestJS module per feature (only ONE module per domain module!)

Each feature folder = vertical slice with core/ + http/ + persistence/
Use the decision tree to choose: new feature vs sub-feature vs shared/
```

---

## Terminology

| Term                | What it is                                                                                      | Example                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Domain module**   | One bounded context: `src/module/{context}/` with one NestJS module (`{context}.module.ts`)      | `catalog`, `ticketing`, `billing`          |
| **Sub-domain module** | Optional nested module with its own NestJS module, for a distinct operational area            | `catalog/admin/` ([architecture-guidelines.md](./architecture-guidelines.md#sub-domain-module)) |
| **Feature**         | A business concept inside a domain module                                                       | `event`, `artist` (inside Catalog)         |
| **Feature folders** | Organizing a module's code into folders per feature, with no technical boundaries between them |                                            |

**Important**:

- A domain module **IS** the unit of extraction: it is what becomes a separate service if needed ([ADR-006](../../../docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md))
- A domain module **HAS** technical boundaries: it exports only its public API token ([modular-architecture-principles.md §1](./modular-architecture-principles.md#1-well-defined-boundaries))
- A feature **IS NOT** a unit of extraction: it always ships with its module
- A feature **HAS NO** technical boundaries: features inject each other's services directly. The folders are only for organization.

---

## Introduction

**Feature folders** organize code by business feature, where each folder holds everything that feature needs: logic, API, persistence.

Each feature is a **vertical slice** that cuts through every technical layer. That gives high cohesion inside a feature and low coupling between features.

**Key decision**: use **one NestJS module** for the whole domain module, with folders organized by business feature.

**Also known as**: Vertical Slice Architecture, Package by Feature, Screaming Architecture

### What Feature Folders Are NOT

Feature folders are different from **feature modules** (the NestJS pattern):

| Aspect            | Feature folders (our approach)     | Feature modules (NestJS)               |
| ----------------- | ---------------------------------- | -------------------------------------- |
| **Boundaries**    | Folders only (visual)              | NestJS modules (technical)             |
| **DI complexity** | Simple (direct injection)          | Complex (imports/exports, forwardRef)  |
| **Circular deps** | Impossible between modules (only 1) | Common, needs `forwardRef()`           |
| **Encapsulation** | None (free access within the module) | Via exports                          |

### When to Apply Feature Folders

Feature folders are **optional**. Apply them when:

- A module has ≥5 services or use cases
- Navigating the module has become hard
- Its features have independent lifecycles
- You want to make a later split (into sub-domain modules or new contexts) easier

**Currently in Seat Sure:**

- `catalog/`: 1 service, 3 repositories, 6 entities. Standard layout; feature folders not needed yet.
- Other contexts: not built yet. Start them with the standard layout.

---

## Visual: Current vs Feature Folders

### Current Structure (Horizontal Layers)

```
catalog/ - current structure (existing code)

catalog/
├── catalog.module.ts
├── core/
│   ├── enum/
│   │   ├── event-status.enum.ts
│   │   └── event-type.enum.ts
│   └── service/
│       └── catalog.service.ts        ← events, artists, seat maps, ticket types
├── http/
│   └── graphql/
│       ├── catalog.resolver.ts       ← every Catalog query and mutation
│       └── type/                     ← 9 input/output types, all features mixed
├── persistence/
│   ├── catalog-persistence.module.ts
│   ├── entity/                       ← 6 entities, all features mixed
│   ├── repository/
│   │   ├── catalog.repository.ts     ← exports EventRepository
│   │   ├── artist.repository.ts
│   │   └── ticket-type.repository.ts
│   └── migration/
└── __test__/

Fine at this size. Once the admin panel adds event, artist, and venue
management, each concept's code would be spread across 3+ folders.
```

### Feature Folders Structure (Vertical Slices, Single Module)

```
✅ catalog/ - with feature folders (SINGLE NestJS module)

catalog/
├── event/                         ← Feature folder (just a folder!)
│   ├── core/
│   │   ├── enum/
│   │   │   ├── event-status.enum.ts
│   │   │   └── event-type.enum.ts
│   │   └── service/
│   │       ├── event.service.ts
│   │       └── event-tickets.service.ts
│   ├── http/
│   │   └── graphql/
│   │       ├── event.resolver.ts
│   │       └── type/
│   │           ├── find-events.type.ts
│   │           └── find-events-input.type.ts
│   ├── persistence/
│   │   ├── entity/
│   │   │   ├── event.entity.ts
│   │   │   ├── event-artist.entity.ts
│   │   │   └── ticket-type.entity.ts
│   │   └── repository/
│   │       ├── event.repository.ts
│   │       └── ticket-type.repository.ts
│   └── __test__/
│
├── artist/                        ← Feature folder (just a folder!)
│   ├── core/service/artist.service.ts
│   ├── http/graphql/artist.resolver.ts
│   └── persistence/
│       ├── entity/artist.entity.ts
│       └── repository/artist.repository.ts
│
├── venue/                         ← Feature folder, once venues have behavior
│   └── persistence/entity/
│       ├── venue.entity.ts
│       └── seat-map.entity.ts
│
├── shared/                        ← Shared within Catalog
│   └── persistence/
│       ├── catalog-persistence.module.ts   ← Registers the 'catalog' DataSource
│       ├── typeorm-datasource.ts
│       ├── typeorm-datasource.factory.ts
│       └── migration/                      ← One migrations table per module
│
├── integration/
│   └── provider/public-api.provider.ts     ← Module-wide public API
│
└── catalog.module.ts              ← SINGLE NestJS module for the whole context!
```

**Key insight**: each feature folder is a vertical slice through every technical layer. There is **NO** `event.module.ts`, `artist.module.ts`, etc.

---

## Organization Hierarchy (4 Levels)

### Level 1: Domain Module (Bounded Context)

```
src/module/
├── catalog/          ← Domain module (bounded context)
├── ticketing/        ← Domain module (planned)
├── billing/          ← Domain module (planned)
└── shared/           ← Cross-cutting technical modules and inter-module contracts
```

- One per bounded context ([architecture-guidelines.md](./architecture-guidelines.md#domain-modules))
- Each has its own models, DataSource, and tables
- **Each has ONE NestJS module file**

### Level 2: Sub-Domain Module (Optional)

```
catalog/
├── admin/            ← Sub-domain module (with its own NestJS module)
└── browse/           ← Sub-domain module
```

- Separates distinct operational areas within a context (back-office management vs public browsing, or a worker)
- Each sub-domain module has ONE NestJS module
- Rare; don't create one until an operational area clearly stands apart

### Level 3: Feature (Vertical Slice), JUST FOLDERS

```
catalog/
├── event/              ← Feature folder (NO module file!)
├── artist/             ← Feature folder (NO module file!)
├── venue/              ← Feature folder (NO module file!)
├── shared/             ← Shared within the module
├── integration/        ← Public API provider
└── catalog.module.ts   ← SINGLE module registers ALL providers
```

**This is where feature folders apply.**

- Each folder = a complete vertical slice
- Contains `core/` + `http/` + `persistence/`
- **NO** NestJS module per feature
- All providers are registered in the parent module

Inside a sub-domain module, feature folders sit under the sub-domain folder (`catalog/admin/event/`).

### Level 4: Technical Layers (Inside Features)

```
event/
├── core/              ← Business logic
├── http/              ← API layer
├── persistence/       ← Entities and repositories
├── queue/             ← Async processing (if needed)
└── __test__/          ← Tests
```

The layers follow [architecture-guidelines.md](./architecture-guidelines.md) exactly (same folders, suffixes, and principles). Only their location changes.

---

## Anatomy of a Feature Folder

### Template Structure

```
event/                                    // ← Feature folder name (business noun, singular)
├── core/                                 // ↓ Business logic
│   ├── service/
│   │   ├── event.service.ts                    // Domain services
│   │   └── event-tickets.service.ts            // Related services
│   ├── use-case/                               // OPTIONAL, for orchestration
│   │   └── publish-event.use-case.ts
│   ├── enum/
│   │   └── event-status.enum.ts                // Feature-specific enums
│   ├── model/                                  // Domain models, if needed
│   └── exception/
│       └── event-not-found.exception.ts
│
├── http/                                 // ↓ API layer
│   └── graphql/
│       ├── event.resolver.ts                   // Queries and mutations
│       └── type/
│           ├── find-events-input.type.ts       // @InputType
│           └── find-events.type.ts             // @ObjectType
│
├── persistence/                          // ↓ Data layer
│   ├── entity/
│   │   ├── event.entity.ts                     // Feature OWNS this entity
│   │   └── event-artist.entity.ts              // Related entities
│   └── repository/
│       └── event.repository.ts                 // Data access
│
├── queue/                                // ↓ Async processing (if needed)
│   ├── consumer/
│   │   └── event-published.queue-consumer.ts
│   └── producer/
│       └── event-changes.queue-producer.ts
│
└── __test__/                             // ↓ Tests
    ├── e2e/
    │   └── event/
    │       └── find-events.spec.ts
    └── factory/
        └── event.factory.ts

// ⚠️ NOTE: NO event.module.ts file! All providers go in catalog.module.ts
```

Notes:

- REST stays the exception ([ADR-001](../../../docs/adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md)). A feature that needs a webhook or upload adds `http/rest/` as described in the architecture guidelines.
- `test/jest.e2e.ts` already matches `src/**/__test__/e2e/**/*.spec.ts`, so specs inside feature folders run without config changes. E2E tests still boot the whole domain module: `createNestApp([CatalogModule])`.
- Unit tests still have no folder (see [architecture-guidelines.md](./architecture-guidelines.md#testing-principles)).

---

## Decision Tree: When to Create a Feature Folder?

Use this flowchart when adding new functionality to a module that uses feature folders:

```
START: New functionality needs to be implemented

    ↓

❓ Does it have its own business vocabulary?
   (e.g., "Artist" has stage name, bio, genres)
    │
    ├─ NO → It's a helper/utility, add to an existing feature
    │         Example: a slug validator for events is part of "event"
    │
    └─ YES ↓

❓ Does it have its own root-level query or mutation?
   (e.g., findArtistBySlug vs a field nested in another feature's result)
    │
    ├─ NO → Probably a sub-feature
    │         Example: an event's lineup is returned inside the event → part of event/
    │
    └─ YES ↓

❓ Can it exist without other features?
   (e.g., an artist exists without events vs a ticket type needs its event)
    │
    ├─ NO → Sub-feature, integrate into the parent
    │         Example: TicketType is deleted with its Event (cascade) → part of event/
    │
    └─ YES ↓

❓ Does it have ≥3 files of its own logic?
   (services, entities, repositories)
    │
    ├─ NO → Maybe too small, consider whether it will grow
    │
    └─ YES ↓

✅ CREATE FEATURE FOLDER!
   Examples: event/, artist/


⚠️ SPECIAL CASE: Cross-Cutting Concerns

❓ Is it used by ≥3 features but belongs to none of them?
   (e.g., a slug generator used by event, artist, and venue)
    │
    └─ YES → Put it in the module's shared/ folder!
              Example: catalog/shared/core/service/slug.service.ts
```

### Quick Reference Table

Applied to Catalog's concepts today:

| Criteria         | Question                     | Event                 | Artist              | Lineup (`EventArtist`) | Ticket types          | Venue & seat maps          | Slug generator |
| ---------------- | ---------------------------- | --------------------- | ------------------- | ---------------------- | --------------------- | -------------------------- | -------------- |
| **Vocabulary**   | Own business terms?          | ✅ type, status, date | ✅ stage name, bio  | ❌ event + artist terms | ✅ price, section     | ✅ layout, section, stage  | ⚠️ technical   |
| **Entry point**  | Root-level query/mutation?   | ✅ `findEvents`       | ✅ `findArtistBySlug` | ❌ inside the event    | ✅ `findEventTickets` | ❌ not yet                 | ❌ none        |
| **Independence** | Exists without others?       | ✅ Yes                | ✅ Yes              | ❌ Needs both          | ❌ Needs its event    | ✅ Yes                     | ⚠️ utility     |
| **Files**        | ≥3 files of logic?           | ✅ Yes                | ✅ Yes              | ❌ 1 entity            | ✅ Yes                | ⚠️ 2 entities, no logic    | ❌ 1 file      |
| **Decision**     |                              | ✅ **Feature**        | ✅ **Feature**      | ❌ **Sub-feature** (event) | ❌ **Sub-feature** (event) | ⚠️ **Not yet** ([Anemic](#anti-pattern-3-anemic-feature)) | 📁 **Shared** |

Venues and seat maps become a `venue/` feature once they get their own behavior (venue management in the admin panel, "events near you", the planned `Seat` entity).

---

## Cohesion Criteria (with Seat Sure Examples)

### ✅ High Cohesion: Separate Features

#### Example 1: Event vs Artist

```
catalog/
├── event/     ✅ Separate features
└── artist/    ✅ Separate features
```

**Why separate?**

- Different vocabulary (type, status, dates vs stage name, bio, genres)
- Different lifecycles (an event ends; an artist stays across many events)
- Different entry points (`findEvents` vs `findArtistBySlug`)
- Different admin screens planned (event management vs artist management)

#### Example 2: Event vs Venue (once venues have behavior)

```
catalog/
├── event/     ✅ Could be separate features
└── venue/     ✅ Could be separate features
```

**Why could they be separate?**

- Different vocabulary (show dates, status vs address, capacity, seat map layout)
- A venue and its seat maps exist before any event and are reused across events
- Different workflows (setting up a venue's seat map vs publishing an event)

### ❌ Low Cohesion: DO NOT Separate

#### Example 1: Lineup within Event

```
event/
└── persistence/
    └── entity/
        ├── event.entity.ts
        └── event-artist.entity.ts   ✅ Keep here!
```

**Why keep together?**

- A lineup entry can't exist without its event (deleted in cascade)
- No query of its own; it is returned with the event
- Headliner and performance order describe the event's program, and the entry shares the event's lifecycle
- It also references an artist, but an artist in a lineup can't be deleted (`RESTRICT`), so the event is the owner

#### Example 2: Ticket Types within Event

```
event/
└── persistence/
    └── entity/
        ├── event.entity.ts
        └── ticket-type.entity.ts   ✅ Keep here!
```

**Why keep together?**

- Ticket types are part of the event: one per event section, deleted with the event ([ADR-011](../../../docs/adrs/011-catalog-owns-ticket-types-and-seat-maps.md))
- An admin creates them together with the event
- They can't be understood without their event

---

## The `shared/` Folder Rules

`{module}/shared/` is shared **within one module**. It is not `src/module/shared/`, which holds cross-cutting technical modules and the contracts between modules ([architecture-guidelines.md](./architecture-guidelines.md#shared-module-shared)).

### ✅ DO use `shared/` for:

**1. Technical infrastructure**

```
catalog/
└── shared/
    └── persistence/
        ├── catalog-persistence.module.ts   ✅ Named DataSource registration
        ├── typeorm-datasource.ts           ✅ DataSource for the TypeORM CLI
        ├── typeorm-datasource.factory.ts   ✅ DataSource options
        └── migration/                      ✅ Module-wide migrations
```

**2. Code used by ≥3 features**

```
catalog/
└── shared/
    └── core/
        └── service/
            └── slug.service.ts   ✅ Used by event, artist, and venue (all have public slugs)
```

**3. Cross-cutting technical services**

```
catalog/
└── shared/
    └── core/
        └── service/
            └── geo-distance.service.ts   ✅ "Near you" listings, the artist page's nearby events, venue search
```

### ❌ DO NOT use `shared/` for:

**1. Feature-specific entities**

```
// ❌ WRONG
catalog/shared/
└── persistence/
    └── entity/
        └── event.entity.ts   ❌ Belongs to the event feature!

// ✅ CORRECT
catalog/event/
└── persistence/
    └── entity/
        └── event.entity.ts   ✅ The event feature owns this
```

**2. Feature-specific business logic**

```
// ❌ WRONG
catalog/shared/
└── core/
    └── service/
        └── event.service.ts   ❌ Business logic belongs to its feature!

// ✅ CORRECT
catalog/event/
└── core/
    └── service/
        └── event.service.ts   ✅ In the event feature
```

**3. Code used by only 2 features**

```
// ❌ WRONG - premature abstraction
catalog/shared/
└── core/
    └── enum/
        └── event-status.enum.ts   ❌ Used by event and artist only

// ✅ CORRECT - keep it in the primary feature, import it where needed
catalog/event/
└── core/
    └── enum/
        └── event-status.enum.ts   ✅ The primary user owns it

💡 HEURISTIC: wait for the 3rd usage before moving something to shared/
```

---

## Implementation Checklist

### 1. Planning

- [ ] **Name**: a business noun, singular, kebab-case (`event`, `artist`, `venue`)
- [ ] **Location**: the right domain module (`catalog/`, `ticketing/`)
- [ ] **Validation**: run the decision tree. Is it really a feature?

### 2. First Feature Folder in a Module (one-time setup)

- [ ] Add the feature-folder rule to `.projectStructurerc.json` and switch the module's entry under `module_folder` to it (tracked in `todo.md`)
- [ ] Move the persistence infrastructure to `shared/persistence/`: the persistence module, both DataSource files, and `migration/`
- [ ] Widen the entities glob in `typeorm-datasource.factory.ts` to every feature: `join(__dirname, '..', '..', '**', 'persistence', 'entity', '*.entity.{ts,js}')`
- [ ] Update the `{module}:db:generate`, `{module}:db:migrate`, and `{module}:db:drop` scripts in `package.json` to the new `typeorm-datasource.ts` and `migration/` paths
- [ ] Move repository registration from the persistence module to `{module}.module.ts`. The persistence module keeps only the DataSource. `TypeOrmModule.forRootAsync` registers it globally, so repositories in any feature can still use `@InjectDataSource('{module}')`.

### 3. Structure Setup

```bash
FEATURE=event
MODULE=catalog

mkdir -p src/module/$MODULE/$FEATURE/core/service
mkdir -p src/module/$MODULE/$FEATURE/http/graphql/type
mkdir -p src/module/$MODULE/$FEATURE/persistence/entity
mkdir -p src/module/$MODULE/$FEATURE/persistence/repository
mkdir -p src/module/$MODULE/$FEATURE/__test__/e2e/$FEATURE
mkdir -p src/module/$MODULE/$FEATURE/__test__/factory
```

### 4. Move Existing Files (keep git history)

```bash
git mv src/module/catalog/persistence/entity/event.entity.ts \
       src/module/catalog/event/persistence/entity/

git mv src/module/catalog/persistence/repository/catalog.repository.ts \
       src/module/catalog/event/persistence/repository/event.repository.ts

git mv src/module/catalog/core/enum/event-status.enum.ts \
       src/module/catalog/event/core/enum/

git mv src/module/catalog/http/graphql/type/find-events.type.ts \
       src/module/catalog/event/http/graphql/type/
```

Name files after the concept they hold, not the module (`catalog.repository.ts` exports `EventRepository`, so it becomes `event.repository.ts`).

### 5. Update Imports

- [ ] Update the `@catalogModule/...` paths in moved files and in the files that import them
- [ ] **DO NOT create feature module files**

### 6. Register Providers in the Parent Module (IMPORTANT!)

```typescript
// src/module/catalog/catalog.module.ts - the SINGLE module registers ALL providers from ALL features
import { Module } from '@nestjs/common';
import { CatalogPersistenceModule } from '@catalogModule/shared/persistence/catalog-persistence.module';
import { CatalogPublicApiProvider } from '@catalogModule/integration/provider/public-api.provider';
import { CatalogEventApi } from '@sharedModules/integration/interface/catalog-integration.interface';

// Event feature
import { EventService } from '@catalogModule/event/core/service/event.service';
import { EventTicketsService } from '@catalogModule/event/core/service/event-tickets.service';
import { EventRepository } from '@catalogModule/event/persistence/repository/event.repository';
import { TicketTypeRepository } from '@catalogModule/event/persistence/repository/ticket-type.repository';
import { EventResolver } from '@catalogModule/event/http/graphql/event.resolver';

// Artist feature
import { ArtistService } from '@catalogModule/artist/core/service/artist.service';
import { ArtistRepository } from '@catalogModule/artist/persistence/repository/artist.repository';
import { ArtistResolver } from '@catalogModule/artist/http/graphql/artist.resolver';

@Module({
  imports: [
    CatalogPersistenceModule, // Only infrastructure modules
  ],
  providers: [
    // Event
    EventService,
    EventTicketsService,
    EventRepository,
    TicketTypeRepository,
    EventResolver,

    // Artist
    ArtistService,
    ArtistRepository,
    ArtistResolver,

    // Public API
    { provide: CatalogEventApi, useClass: CatalogPublicApiProvider },
  ],
  exports: [CatalogEventApi], // Only the contract token, never concrete classes
})
export class CatalogModule {}
```

**⚠️ IMPORTANT: do NOT create `event.module.ts`, `artist.module.ts`, etc. Feature folders are JUST folders.**

### 7. Validation

```bash
pnpm --filter api lint:check     # structure + lint
pnpm --filter api build
pnpm --filter api test:db:reset
pnpm --filter api test:e2e
```

Also run the duplicate table name check in [modular-architecture-principles.md §8](./modular-architecture-principles.md#critical-violation-duplicate-table-names). A moved entity must keep its table name.

---

## Common Anti-Patterns

### Anti-Pattern 1: God Module

**Problem**: one module with many services and responsibilities in flat layer folders.

```
// ❌ BAD: everything in catalog/core/service/
catalog/
└── core/
    └── service/
        ├── event.service.ts
        ├── event-publishing.service.ts
        ├── event-tickets.service.ts
        ├── artist.service.ts
        ├── artist-admin.service.ts
        ├── venue.service.ts
        ├── seat-map-editor.service.ts
        ├── nearby-events.service.ts
        └── slug.service.ts
```

**Solution**: extract feature folders (NOT modules!).

```
// ✅ GOOD: each concept is a feature FOLDER (not a module)
catalog/
├── event/            ✅ Feature folder (no module file!)
│   └── core/service/
│       ├── event.service.ts
│       ├── event-publishing.service.ts
│       ├── event-tickets.service.ts
│       └── nearby-events.service.ts
├── artist/           ✅ Feature folder (no module file!)
│   └── core/service/
│       ├── artist.service.ts
│       └── artist-admin.service.ts
├── venue/            ✅ Feature folder (no module file!)
│   └── core/service/
│       ├── venue.service.ts
│       └── seat-map-editor.service.ts
├── shared/
│   └── core/service/
│       └── slug.service.ts
└── catalog.module.ts ✅ SINGLE module registers ALL providers
```

### Anti-Pattern 2: Feature Modules (NestJS Pattern)

**Problem**: a NestJS module per feature causes circular dependencies.

```
// ❌ BAD: several modules cause circular deps and need forwardRef()
catalog/
├── event/
│   └── event.module.ts      ❌ DON'T DO THIS!
├── artist/
│   └── artist.module.ts     ❌ DON'T DO THIS!
└── catalog.module.ts        ← imports feature modules

// The artist page needs events, and events need artists for their lineup:
@Module({
  imports: [forwardRef(() => EventModule)],  ❌ Circular dependency!
})
export class ArtistModule {}
```

**Solution**: a single module with feature folders.

```
// ✅ GOOD: single module, no circular deps
catalog/
├── event/                   ✅ Just a folder
│   └── core/service/...
├── artist/                  ✅ Just a folder
│   └── core/service/...
└── catalog.module.ts        ✅ Registers ALL providers

// Simple, no forwardRef needed:
@Module({
  providers: [
    EventService,
    ArtistService, // Direct injection, no circular dep!
  ],
})
export class CatalogModule {}
```

### Anti-Pattern 3: Anemic Feature

**Problem**: a feature with only an entity and a repository, and no business logic.

```
// ❌ BAD: just data, no behavior
venue/
└── persistence/
    ├── entity/
    │   └── venue.entity.ts      ❌ Only this?
    └── repository/
        └── venue.repository.ts
```

**Solution**: without business logic, it probably isn't a feature yet.

```
// ✅ OPTION 1: part of shared/ (if many features use it)
catalog/shared/
└── persistence/
    └── entity/
        └── venue.entity.ts   ✅ Simple lookup table

// ✅ OPTION 2: part of the feature that uses it
event/
└── persistence/
    └── entity/
        ├── event.entity.ts
        └── venue.entity.ts   ✅ Events are held at venues
```

This is where Catalog's venues and seat maps are today: two entities, no service, no query of their own.

### Anti-Pattern 4: Technical Layers at the Module Root

**Problem**: mixing feature folders with layer folders.

```
// ❌ BAD: inconsistent organization
catalog/
├── event/             ← Feature folder
├── artist/            ← Feature folder
├── core/              ← Layer folder (inconsistent!)
│   └── service/
│       └── slug.service.ts
└── persistence/       ← Layer folder (inconsistent!)
```

**Solution**: a consistent structure. Everything is a feature or lives in `shared/`.

```
// ✅ GOOD: features at the root, shared/ for cross-cutting code
catalog/
├── event/             ✅ Feature folder
├── artist/            ✅ Feature folder
├── shared/            ✅ Shared within the module
│   ├── core/
│   │   └── service/
│   │       └── slug.service.ts
│   └── persistence/
│       └── catalog-persistence.module.ts
└── integration/       ✅ The one exception: the module's public API
```

`integration/` stays at the root because the public API provider belongs to the whole module (its boundary), not to one feature.

---

## Candidate Split for Catalog

Not planned yet. This is the likely split once Catalog reaches the threshold, most likely when the admin panel adds event, artist, and venue management (`todo.md` → "Painel de Admin"). The subdomains come from [domain-identification-example.md](./domain-identification-example.md).

| Feature    | Services (after splitting `CatalogService`)                                   | Entities                              | Operations                                         |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| **event**  | `EventService` (create, home sections, listing), `EventTicketsService`        | `Event`, `EventArtist`, `TicketType`  | `createEvent`, `getHomeSections`, `findEvents`, `findEventTickets` |
| **artist** | `ArtistService` (artist page)                                                  | `Artist`                              | `findArtistBySlug`                                 |
| **venue**  | Once it has behavior: venue and seat map management                           | `Venue`, `SeatMap`, `Seat` (planned)  | none yet                                           |
| **shared** | Infrastructure                                                                 | none                                  | none                                               |

Until `venue/` has behavior, `Venue` and `SeatMap` sit in `event/` ([Anemic Feature](#anti-pattern-3-anemic-feature), option 2), because events use seat maps.

Migration order when it happens:

1. Split `CatalogService` into per-feature services in the current layout, with the e2e tests passing
2. Do the one-time setup ([checklist step 2](#2-first-feature-folder-in-a-module-one-time-setup))
3. Move `event/`, then `artist/`, one feature per commit
4. Split `CatalogResolver` into per-feature resolvers. GraphQL operation names don't change, so the web app is unaffected.

---

## Quick Reference

### Feature Folder Template

```
feature-name/
├── core/          # Business logic
│   ├── service/
│   ├── use-case/  # Optional
│   ├── enum/
│   ├── model/
│   └── exception/
├── http/          # API layer
│   └── graphql/
│       ├── {name}.resolver.ts
│       └── type/
├── persistence/   # Data layer
│   ├── entity/
│   └── repository/
├── queue/         # Optional
└── __test__/      # Tests

⚠️ NO module file! (e.g., NO feature-name.module.ts)
```

### Decision Checklist

- [ ] Has its own business vocabulary?
- [ ] Has a root-level query or mutation?
- [ ] Can exist independently?
- [ ] Has ≥3 files of logic?

→ YES to 3+ = create a feature folder (NOT a module)!

### When to Use `shared/`

- ✅ Used by ≥3 features
- ✅ Technical infrastructure (persistence module, DataSource, migrations)
- ✅ Cross-cutting technical services (slug generator)
- ❌ Feature-specific business logic
- ❌ Feature-specific entities (they have owners!)

### File Naming

Unchanged from [architecture-guidelines.md](./architecture-guidelines.md#naming-convention-reference): `{kebab-case}.service.ts`, `.use-case.ts`, `.entity.ts`, `.repository.ts`, `.resolver.ts`, `.type.ts`, and so on.

---

## Why NOT Feature Modules?

### Rationale for Seat Sure

**1. Transactions span features**

- Creating an event in the admin panel will write the event, its lineup, and its ticket types together
- `@Transactional({ connectionName: 'catalog' })` covers that naturally when they share one module and one DataSource
- Business operations **naturally span several features**, and one module keeps them simple

**2. One developer, one deploy**

- Seat Sure is built by one developer and deployed as one application ([ADR-006](../../../docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md))
- Strong boundaries between features add no value there

**3. Granularity already exists**

- The domain module already carries the real boundary: its own DataSource, tables, and public API
- Feature modules inside it would add an **extra layer of granularity**
- Folders are enough

**4. Simplicity over complexity**

- **Avoids**: `forwardRef()`, per-feature export lists, extra DI wiring
- **Gains**: simpler code, direct injection, natural transactions
- **Result**: less code to maintain, more focus on business logic

### When to Reevaluate

Consider **feature modules** if:

- ✅ Features inside a module need **strong technical isolation** (compliance, auditing)
- ✅ The **architecture changes** and features become separate deploy units
- ✅ Different teams maintain different features **and can't coordinate**

**Note**: if a feature needs a separate deploy, it should probably be its own **domain module** (a new bounded context), not a feature module. `bounded-contexts.md` already anticipates one such case: venues and seats could become their own context if seating gets complex.

---

## Learn More

### Key Concepts & Thought Leaders

**Vertical Slice Architecture**

- Creator: **Jimmy Bogard** (MediatR, AutoMapper)
- Key idea: features as complete vertical slices through all layers
- [Blog](https://jimmybogard.com) | [GitHub](https://github.com/jbogard)

**Screaming Architecture**

- Creator: **Robert Martin (Uncle Bob)**
- Key idea: the architecture should "scream" what the system does, not how it's built
- See: _Clean Architecture_

**Package by Feature**

- Popularized by: **Martin Fowler**
- Key idea: package by business feature, not technical function

### Related Seat Sure Documents

- [architecture-guidelines.md](./architecture-guidelines.md): folder structure, layers, naming
- [modular-architecture-principles.md](./modular-architecture-principles.md): module boundaries and communication
- [domain-identification-guidelines.md](./domain-identification-guidelines.md): finding the subdomains that become features
- [ADR-006](../../../docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md): modular monolith with state isolation

### Integration with Existing Patterns

Feature folders **complement** the existing patterns:

- ✅ Keep lean resolvers and controllers
- ✅ Keep the repository pattern (`DefaultTypeOrmRepository`)
- ✅ Keep transaction management (`@Transactional({ connectionName })`)
- ✅ Keep the public API provider for communication between modules

The only change is **where** files live, not **how** they work.
