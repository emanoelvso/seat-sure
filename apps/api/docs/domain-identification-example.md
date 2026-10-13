# Domain Identification Example

A worked example of [domain-identification-guidelines.md](./domain-identification-guidelines.md), applied to Seat Sure's Catalog module.

- **Snapshot**: commit `fb6a0cc`, 2026-09-29. The code will move on; re-run the analysis instead of trusting these numbers later.
- **Scope**: `apps/api/src/module/catalog/` (the only module in code), checked against the planned contexts in [`docs/architecture/bounded-contexts.md`](../../../docs/architecture/bounded-contexts.md).
- **Source of truth**: `bounded-contexts.md` and the ADRs. Findings that need work are tracked on the [project board](https://github.com/users/emanoelvso/projects/3).

## Example: Analyzing the Catalog Module

### Step 1: Extract Concepts

**Entities** (`persistence/entity/`):

- `Event` (with `EventType`, `EventStatus`), `EventArtist`, `Artist`
- `Venue`, `SeatMap`, `TicketType`

**Services** (`core/service/`):

- `CatalogService`: `createEvent`, `getHomeSections`, `findEvents`, `findArtistBySlug`, `findEventTickets`

**Repository queries** (`persistence/repository/`):

- `EventRepository`: `findByType`, `findUpcomingByArtist`, `findSimilarConcerts`, `findUpcomingPublishedById`, `findNextFestival`
- `ArtistRepository`: inherited methods only
- `TicketTypeRepository`: `findByEvent`

**Use cases**: none.

**Entry points** (`http/graphql/catalog.resolver.ts`):

- Mutation: `createEvent`
- Queries: `getHomeSections`, `findEvents`, `findArtistBySlug`, `findEventTickets`

**Planned, not in code** (`bounded-contexts.md`, the project board): `Seat` in Catalog; `SeatHold`, `Order`, `OrderItem`, `Ticket` in Ticketing.

### Step 2: Group by Ubiquitous Language

#### Group 1: Event Discovery Language

**Terms**: event, type (concert, show, sport, festival), category, status (draft, published, canceled, sold out, finished), city, date, tags, home sections

**Concepts**:

- Entities: `Event`
- Enums: `EventType`, `EventStatus`
- Service methods: `createEvent`, `getHomeSections`, `findEvents`
- Queries: `findByType`

**Analysis**: high linguistic cohesion. `Event` also carries terms from other groups: `venue`, `city`, and `country` as strings (venue language) and a float `price` (pricing language).

#### Group 2: Artist Language

**Terms**: artist, stage name, slug, bio, genres, lineup, headliner, performance order, upcoming shows, similar concerts, featured festival

**Concepts**:

- Entities: `Artist`, `EventArtist`
- Service methods: `findArtistBySlug`
- Queries: `findUpcomingByArtist`, `findSimilarConcerts`, `findNextFestival`

**Analysis**: high linguistic cohesion. The artist page is mostly a view over events: three of its four queries run on `EventRepository`. `EventArtist` (the lineup) bridges this group and Event Discovery. Its lifecycle follows the event (deleted in cascade), so in a feature-folder split it goes with the event ([feature-folders-guidelines.md](./feature-folders-guidelines.md#example-1-lineup-within-event)).

#### Group 3: Venue & Seat Map Language

**Terms**: venue, address, capacity, latitude, longitude, seat map, layout, view box, stage, section, shape, label

**Concepts**:

- Entities: `Venue`, `SeatMap` (layout types in `seat-map.entity.ts`)
- Service methods: `mapSeatMap` (private, used by `findEventTickets`)

**Analysis**: high linguistic cohesion, but no behavior of its own: no repository, no service method, no query. `SeatMap` is only read through `Event.seatMap`, and `Venue` is never read.

#### Group 4: Ticket Type Language

**Terms**: ticket type, section key, price (cents), currency, seats available, max per order, tags

**Concepts**:

- Entities: `TicketType`
- Service methods: `findEventTickets`, `mapTicketType`
- Queries: `findByEvent`

**Analysis**: medium linguistic cohesion. Price tier terms belong to Catalog, but "seats available" and "max per order" are selling terms that `bounded-contexts.md` gives to Ticketing ([ADR-011](../../../docs/adrs/011-catalog-owns-ticket-types-and-seat-maps.md) accepts this for now).

### Step 3: Identify Domains

#### Domain: Catalog

**Type**: Core Domain (per `bounded-contexts.md`)

**Ubiquitous Language**: event, artist, lineup, venue, seat map, section, ticket type, price

**Subdomains**:

1. **Event Discovery** (Core)
   - Concepts: `Event`, `EventType`, `EventStatus`, `createEvent`, `getHomeSections`, `findEvents`
   - Cohesion: 9/10 (L2 U3 D2 C2)
   - L2: `Event` holds venue and price fields from other groups. U3: all three operations use only `EventRepository`. D2: one entity and its enums. C2: `event.entity.ts` changed on its own in 5 of its 7 commits.

2. **Artists** (Supporting)
   - Concepts: `Artist`, `EventArtist`, `findArtistBySlug`
   - Cohesion: 9/10 (L3 U2 D2 C2)
   - U2: the artist page depends on Event Discovery for three of its four queries. C2: `artist` and `event-artist` were created together (`dcd7313`).
   - Dependencies: → Event Discovery

3. **Venues & Seat Maps** (Supporting)
   - Concepts: `Venue`, `SeatMap`
   - Cohesion: 8/10 (L3 U1 D2 C2)
   - U1: no operations of its own. D2: `SeatMap → Venue`. C2: `venue` and `seat-map` changed together in `7d373aa` and `09e97c7`.

4. **Ticket Types** (Core)
   - Concepts: `TicketType`, `findEventTickets`
   - Cohesion: 8/10 (L2 U3 D2 C1)
   - L2: mixes price tier and inventory terms. U3: `findEventTickets` reads the event, its seat map, and its ticket types together. C1: a single commit so far (`850b3bb`).
   - Dependencies: → Event Discovery, → Venues & Seat Maps (by section key)

**Dependencies**:

- ← Ticketing (planned): reads events and ticket types through Catalog's public API (ADR-011)
- ← Social Proof (planned): testimonials reference `eventId`

**Cohesion Score**: 8.5/10 (average of subdomains)

The subdomain types are proposals. `bounded-contexts.md` only classifies whole contexts, so confirm them with the project owner before relying on them.

### Step 4: Cohesion Analysis

#### Internal Cohesion (Within Subdomains)

| Subdomain          | Cohesion Score | Status  |
| ------------------ | -------------- | ------- |
| Event Discovery    | 9/10           | ✅ High |
| Artists            | 9/10           | ✅ High |
| Venues & Seat Maps | 8/10           | ✅ High |
| Ticket Types       | 8/10           | ✅ High |

#### Cross-Subdomain and Cross-Domain Cohesion

| A                  | B                   | Cohesion | Relationship                                                                                              | Issue?                               |
| ------------------ | ------------------- | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Event Discovery    | Artists             | 7/10     | `EventArtist` links them; the artist page queries events                                                  | ✅ Expected inside one context       |
| Event Discovery    | Venues & Seat Maps  | 3/10     | `Event` stores the venue as strings and never references `Venue`                                          | ❌ Two models of a venue             |
| Event Discovery    | Ticket Types        | 6/10     | `TicketType → Event` (cascade); `Event.price` (float) repeats what ticket types price in cents            | ⚠️ Two models of price (tracked)     |
| Venues & Seat Maps | Ticket Types        | 5/10     | `TicketType.sectionKey` must match a section `key` in `SeatMap.layout` (JSONB); nothing in the API checks it | ⚠️ Convention only                   |
| Catalog            | Ticketing (planned) | n/a      | `seatsAvailable` lives in Catalog, but sales will happen in Ticketing                                     | ⚠️ Accepted in ADR-011               |
| Catalog            | Ticketing (planned) | n/a      | `bounded-contexts.md` draws FKs from `order_items`, `seat_holds`, `tickets` into Catalog tables           | ❌ Breaks ADR-006 (tracked)          |

### Step 5: Low Cohesion Issues

#### Issue #1: Two Models of a Venue Inside Catalog

**Location**: `persistence/entity/event.entity.ts` (`venue`, `city`, `country` columns) and `persistence/entity/venue.entity.ts`

**Problem**:

- `Event` names its venue in free text. `Venue` (address, coordinates, capacity) is only referenced by `SeatMap`.
- An event can name one venue and use a seat map that belongs to another (`Event → SeatMap → Venue`).
- "Events near you" (issue #26) needs the event's coordinates, and those live only on `Venue`.

**Rule**: Unclear Boundaries (Rule 5)

**Cohesion**: 3/10 (Low)

**Suggested fix**:

- Give `Event` a `venueId` reference to `Venue`. Both are in Catalog, so a foreign key is allowed.
- Replicate only the fields listings need (`bounded-contexts.md` already plans denormalized `latitude` / `longitude` for geo queries).

#### Issue #2: Inventory Language in Catalog

**Location**: `persistence/entity/ticket-type.entity.ts` (`seatsAvailable`, `maxPerOrder`)

**Problem**:

- Selling terms that `bounded-contexts.md` assigns to Ticketing live on a Catalog entity.
- Once Ticketing sells seats, keeping `seatsAvailable` current needs a cross-module flow.

**Rule**: Linguistic Mismatch (Rule 1)

**Cohesion**: 6/10 (Medium)

**Suggested fix**: none now. This is the documented trade-off in ADR-011. Revisit when Ticketing gets holds and orders: Catalog keeps the price tier, and Ticketing owns availability.

#### Issue #3: One Service for Four Subdomains

**Location**: `core/service/catalog.service.ts`

**Problem**:

- `CatalogService` serves all four subdomains, and also maps entities to GraphQL types.
- Every new Catalog operation (the admin panel's event, artist, and venue management) will land in the same class.

**Rule**: Mixed Responsibilities (Rule 3)

**Cohesion**: 5/10 (Medium)

**Suggested fix**:

- Not urgent at five methods. When the admin panel work starts, split it by subdomain (`EventService`, `ArtistService`, `EventTicketsService`, ...).
- At about five services, group them into feature folders ([feature-folders-guidelines.md](./feature-folders-guidelines.md#candidate-split-for-catalog)).

#### Issue #4: Identity & Access Classified as Supporting

**Location**: `docs/architecture/bounded-contexts.md` (context map classes)

**Problem**:

- Credentials, sessions, and roles aren't a competitive advantage and need no business-specific knowledge. The decision matrix in [ddd-strategic-design-theory.md](./ddd-strategic-design-theory.md#types-of-subdomains) makes that Generic.
- `bounded-contexts.md` itself says the context is isolated "so you can swap providers (Auth0, Cognito) later". Being buyable is the definition of Generic.

**Cohesion**: n/a (classification, not coupling)

**Suggested fix**: reclassify Identity & Access as Generic. User Profile is a borderline case worth checking at the same time.

### Step 6: Cohesion Map

```
┌─────────────────────────────────────────────────────────────┐
│                CATALOG COHESION MAP (fb6a0cc)               │
└─────────────────────────────────────────────────────────────┘

┌───────────────────┐  EventArtist (7/10)  ┌───────────────────┐
│ EVENT DISCOVERY   │◄─────────────────────┤ ARTISTS           │
│ (Core)       9/10 │                      │ (Supporting) 9/10 │
│ • Event           │                      │ • Artist          │
│ • EventType       │                      │ • EventArtist     │
│ • EventStatus     │                      └───────────────────┘
└────▲─────────┬────┘
     │         │ venue as strings, no reference (3/10) ❌
     │         ▼
     │   ┌───────────────────┐
     │   │ VENUES & SEAT MAPS│
     │   │ (Supporting) 8/10 │
     │   │ • Venue           │
     │   │ • SeatMap         │
     │   └─────────▲─────────┘
     │             │ sectionKey by convention (5/10) ⚠️
     │ FK (6/10)   │
     │             │
┌────┴─────────────┴────────┐
│ TICKET TYPES              │
│ (Core)               8/10 │
│ • TicketType              │
└─────────────▲─────────────┘
              │ public API, plain ticketTypeId (ADR-011) ⚠️
              │
┌─────────────┴─────────────┐
│ TICKETING (planned)       │
└───────────────────────────┘

LEGEND:
✅ High Cohesion (8-10)
⚠️ Medium Cohesion (5-7)
❌ Low Cohesion (0-4)
```

### Step 7: Recommendations

#### High Priority

1. **Reference `Venue` from `Event`** (Issue #1)
   - Replace the `venue` / `city` / `country` strings with `venueId`
   - Unblocks "events near you"
   - Cohesion improvement: 3/10 → 7/10

#### Medium Priority

2. **Split `CatalogService` by subdomain when the admin panel starts** (Issue #3)
   - One service per subdomain; feature folders once there are about five

3. **Keep ADR-011's deviation visible** (Issue #2)
   - When Ticketing gets holds and orders, move availability out of `TicketType`

#### Low Priority

4. **Reclassify Identity & Access as Generic** (Issue #4)

5. **Document the Ubiquitous Language**
   - A glossary of terms per context in `bounded-contexts.md` ("seat", "user", and "event" mean different things in different contexts; see [ddd-strategic-design-theory.md](./ddd-strategic-design-theory.md#ubiquitous-language))

Already tracked on the [project board](https://github.com/users/emanoelvso/projects/3) and not repeated here: prefixing Catalog table names, deriving `Event.price` from ticket types (ADR-012), and removing cross-context FKs from `bounded-contexts.md`.

### Step 8: Final Domain Map

```markdown
## Domain: Catalog

**Type**: Core Domain
**Cohesion**: 8.5/10 ✅
**Ubiquitous Language**: event, artist, lineup, venue, seat map, section, ticket type, price

**Subdomains**:

1. Event Discovery (Core) - 9/10
2. Artists (Supporting) - 9/10
3. Venues & Seat Maps (Supporting) - 8/10
4. Ticket Types (Core) - 8/10

**Dependencies**:

- ← Ticketing (planned): events and ticket types via public API ⚠️ (ADR-011)
- ← Social Proof (planned): eventId reference ✅

**Cohesion Issues**:

- ❌ Two models of a venue (Event strings vs Venue entity)
- ⚠️ Inventory terms on TicketType (accepted, ADR-011)
- ⚠️ One service for four subdomains
```

---

## Summary

**Domains analyzed**: 1 (Catalog; the other six contexts exist only in `bounded-contexts.md`)

**Subdomains identified**: 4

- Event Discovery (Core), Ticket Types (Core)
- Artists (Supporting), Venues & Seat Maps (Supporting)

**Cohesion issues**: 4

- 1 High priority (two models of a venue)
- 2 Medium priority (one service for four subdomains; inventory terms in Catalog, accepted)
- 1 Low priority (Identity & Access classification)

**Overall assessment**:

- ✅ Catalog's vocabulary is consistent, and it matches `bounded-contexts.md`
- ✅ No cross-module coupling in code (Catalog is the only module)
- ⚠️ Venue data is modeled twice
- ⚠️ `CatalogService` will become a god service as the admin panel lands, unless it is split
