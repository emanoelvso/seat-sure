- [ ] C4 Model Documentation
- [ ] Chaos Engineering (Chaos Monkey)
- [ ] Load Testing (k6)

# Implementações

## Página de Compra de Ticket

- [ ] Catalog Module

  - [ ] Implementar Near You com base em (estilo musical, latitude e longitude)
  - [ ] Fazer funcionar o migrate de acordo com o NODE environment (Para criar o banco de testes, adicionar na DOC do projeto)
  - [ ] Add slug on event
  - [ ] Criar Seat Entity (fileira, número, posição no mapa, seção)
  - [ ] Artist carroussel is duplicating artists, needs to be unique

- [ ] Ticketing Module

  - [ ] Create SeatHold Entity
  - [ ] Disponibilidade de assentos por evento (livre, reservado, vendido)

- [ ] Página de escolha de assento (frames "buy ticket choose seat-concert 6–9"): mapa de assentos, ROW e SEAT no hero, destino do "Get a Ticket"
- [ ] Checkout após a reserva (Billing Module)

- [ ] Implementar cursor-based ao invés de skip-offset
- [ ] Buscar Testimonials do GraphQL
- [ ] Cadastro de Testimonials
- [ ] Ver vídeo do Akita sobre como escalar uma plataforma de bilheteria

## Frontend Testing (apps/web)

- [ ] Wire up Vitest config + `test` script in `apps/web/package.json`
- [ ] Storybook interaction tests: add `play()` functions to existing `.stories.tsx`
- [ ] Enable a11y assertions in `.storybook/preview.tsx` (`parameters.a11y.test = 'error'`)
- [ ] Unit tests for `src/lib/` (utils, formatters, apollo helpers)
- [ ] Component tests with `@testing-library/react` + Apollo `MockedProvider`
- [ ] E2E tests with Playwright for critical flows (events list → detail → buy tickets)
- [ ] Visual regression via Chromatic (`@chromatic-com/storybook` already installed)

## Frontend Architecture Migration (apps/web)

Move to the structure in `apps/web/docs/architecture-guidelines.md` (Bulletproof React):

- [x] Rename files to kebab-case with named exports (`SeatMap.tsx` → `seat-map.tsx`, `export function SeatMap`)
- [x] Split `src/components/`:
  - `components/ui/`: Button, Carousel, ComboBox, CountdownBadge, DatePickerBox, IconButton, Input, LocationSelect, PillSelect, SelectBox, ShareButton, SortSelect, SubCategoriePill, TagPill
  - `components/layouts/`: Header, Footer
  - `components/` (used by several features): MainCard, EventShowcase
  - `features/events/`: EventsBanner, SearchBox
  - `features/artists/`: SingerCard, SingersCarousel, EventDateCard, FestivalBanner, VenueMapCard
  - `features/tickets/`: SeatMap, SeatListingCard, TicketsHero, PriceRangeFilter
  - `features/testimonials/`: FeedbackCard, FeedbacksCarousel
  - `features/faq/`: Faq, QuestionAccordion
- [x] Move page views into features: `app/artists/[slug]/Artist.tsx` → `features/artists`, `app/events/[id]/tickets/EventTickets.tsx` → `features/tickets`, the `/events` page body → `features/events`
- [x] Move `src/graphql/queries/*` into each feature's `api/`; entity types shared across features (e.g. from `home-sections.ts`) → `src/types/api.ts`
- [x] Move `src/lib/utils/*`: event-format, formatDateLabel, share, card-props → `src/utils/`; price, ticket-listings → `features/tickets/utils/`; artist-events → `features/artists/utils/`
- [x] Move `src/providers/ApolloProvider.tsx` → `src/app/provider.tsx`; read env vars through `src/config/env.ts`
- [x] Create `src/lib/graphql-server.ts` (confirm Next's fetch cache applies to GraphQL POST requests; otherwise use `unstable_cache`)
- [x] Server-render public pages with ISR (ADR-001): replace `HomeSections` with server fetching in `app/page.tsx`; make `/events` a Server Component with client leaves
- [x] Keep `/events` filters in URL search params
- [x] Server-render the first load of the artist and tickets pages (ADR-001, ADR-008). Both are client-side `useQuery` containers today
- [x] Keep the tickets page filters (quantity, price, sort) in URL search params instead of `useState`
- [x] Add `error.tsx` / `not-found.tsx` to data-fetching routes
- [x] Replace arbitrary Tailwind values (e.g. `text-[#999999]`) with theme tokens (colors only; sizes and percentages stay arbitrary by decision)
- [x] Install `eslint-plugin-check-file` and enable Bulletproof's kebab-case rules
- [x] Adopt GraphQL Code Generator for API types (ADR-001)

Done on branch `refac/web-architecture` (worktree `../seat-sure-web-arch`, not merged). Follow-ups found during the migration:

- [ ] Commit the root `pnpm-lock.yaml` with the migration branch. It's missing the new web deps (`nuqs`, `server-only`, `@date-fns/tz`, codegen, `eslint-plugin-check-file`), so `pnpm install --frozen-lockfile` fails on a fresh clone
- [ ] "Under $100" sends `{ min: 100 }` (`features/events/utils/events-search-params.ts`, `toFindEventsInput`). ALIGN-24 fixes it
- [ ] Top Singers dates use `getDay()` (weekday index) instead of `getDate()` (`features/artists/components/top-singers.tsx`)
- [ ] `MainCard` passes the display date string (`Nov 6, 2026`) to `CountdownBadge`, so the countdown targets local midnight instead of `startAt`
- [ ] `SelectBox` comboboxes on `/events` have no accessible name (the legend doesn't label them); `DatePickerBox` legend has a typo'd class `ml-e`
- [ ] Not-found pages return 404, but their heading and link only reach the browser through the React payload, so the raw HTML body is empty for crawlers and no-JS clients
- [ ] Apollo Client ships on every page, but no client query remains after the migration. Keep it for checkout mutations or load it only where needed
- [ ] Typing in the `/events` city box does a server round trip per keystroke (same as the old per-keystroke refetch). Debounce it
- [ ] The first Storybook run after a dependency change can fail to import while Vite re-optimizes deps. Add `optimizeDeps.include` if it shows up in CI

## Backend Architecture Alignment (apps/api)

Gaps between the current code and `apps/api/docs/`:

- [x] Prefix Catalog table names with the module (`Event` → `CatalogEvent`, `Artist` → `CatalogArtist`, ...): migration, `test/enum/table.enum.ts`, and raw SQL in repositories (e.g. `"EventArtist"` in `catalog.repository.ts`)
- [x] Remove cross-context FKs from `docs/architecture/bounded-contexts.md` (Ticketing → Catalog/Billing); use plain ID references + replicated fields
- [x] Redesign seat locking so it doesn't need a transaction across Catalog and Ticketing (ADR-002 assumes `SELECT ... FOR UPDATE`); record the decision in a new ADR
- [x] Register the `catalog` DataSource with `addTransactionalDataSource` in `catalog-persistence.module.ts`
- [x] `CatalogService` imports GraphQL types from `http/graphql/type/`; move those shapes into `core/`
- [x] Update `.projectStructurerc.json` module list: drop `content`, add `ticketing`, `user-profile`, `social-proof`, `notifications`
- [x] Move `GraphQLModule.forRoot` out of `CatalogModule` before a second module adds resolvers
- [x] Add a `lint` script to `apps/api` so `turbo run lint` covers it
- [x] Clear the existing `lint:check` errors: Prettier in 6 migrations and 2 test factories, `prefer-const` in `catalog.service.ts` (all fixable with `lint:fix`), and unused `_queryRunner` params in `1789400000001-migration.ts` (needs `argsIgnorePattern: '^_'` or removing the params)
- [x] Store `Event` timestamps as `timestamptz` (ADR-003). Today they're `timestamp without time zone` holding Node-local wall time, so queries must pass `now` from the app (ADR-007)
- [ ] Derive `Event.price` from the lowest ticket-type price, or migrate it to `priceCents` + `currency` (ADR-012)
- [x] Add a feature-folder rule to `.projectStructurerc.json` before the first module adopts feature folders: module root holds `{module}.module.ts`, `shared/`, `integration/`, `__test__/` and `{kebab-case}` feature folders with `core/`, `http/`, `persistence/`, `queue/`, `__test__/` (see `feature-folders-guidelines.md`)
- [x] Give `Event` a `venueId` reference to `Venue` instead of the `venue` / `city` / `country` strings. Today an event can name one venue and use another venue's seat map, and "events near you" needs the venue's coordinates (`domain-identification-example.md`, issue #1)
- [x] Reclassify Identity & Access as a Generic subdomain in `docs/architecture/bounded-contexts.md` (decision matrix in `ddd-strategic-design-theory.md`); check User Profile too
- [x] Add a ubiquitous-language glossary per context to `docs/architecture/bounded-contexts.md` ("seat", "user" and "event" mean different things per context)
- [ ] Make each event's seat map belong to its venue. The seeded seat maps have no venue and are shared across venues
- [ ] Store `DefaultEntity`'s `createdAt` / `updatedAt` / `deletedAt` as `timestamptz`
- [ ] Fix the stale `import/no-restricted-paths` zones in `apps/api/eslint.config.mjs` (they name `content` and a non-existent `src/shared`)
- [ ] Register a global `ValidationPipe` in `main.ts`; today only `createNestApp` registers one, so `class-validator` rules are inert in the running app
- [ ] Move the TypeORM `FindManyOptions` building out of `CatalogService.findEvents` into `EventRepository`
- [ ] Cap `name` / `description` in the API `eventFactory`: `faker.lorem.sentence()` sometimes overflows `description` varchar(100) and fails the 101-event e2e test (~0.25% of runs)
- [ ] Index `CatalogEventArtist.eventId`: `findHeadlinersByEventIds` filters on it on every event query, and TypeORM doesn't index FKs on Postgres
- [ ] Filter `getHomeSections` to upcoming published events: today it returns drafts and past events, whose cards link to a tickets page that answers 404
