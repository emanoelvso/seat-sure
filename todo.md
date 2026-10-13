- [x] C4 Model Documentation
- [ ] Chaos Engineering (Chaos Monkey)
- [x] Load Testing (k6)

## Lições de escala (vídeo do Akita)

Fonte: https://www.youtube.com/watch?v=0TMr8rsmU-k ("Como fazer o Ingresso.com escalar?", timestamps da transcrição). Os números do vídeo são ilustrativos, não medições.

- [ ] Hold temporário de assento até o pagamento confirmar (vídeo: ~2 min; aqui são 10 min) — 00:03:54-00:05:04 — já coberto por ADR-015 / Ticketing
- [ ] CDN para assets estáticos — 00:17:52-00:19:08
- [ ] Cache com TTL para páginas iguais para todos — 00:21:07-00:24:01 — parcialmente coberto (ISR, ADR-017)
- [ ] Índices no banco para as queries de leitura mais comuns — 00:20:26-00:21:04
- [ ] Pedido como máquina de estados, sem depender de uma chamada síncrona ao gateway de pagamento — 00:24:29-00:26:03 — Ticketing (`order-status.enum`) e Billing
- [ ] Trabalho lento/externo em jobs de fila com workers (Redis/BullMQ), não async em processo — 00:26:41-00:31:54 — ADR-006 cita BullMQ, ainda não implementado
- [ ] "Shared nothing": servidores web descartáveis, sem estado local — 00:30:25-00:33:21 — ver ADR-016
- [ ] Sala de espera para a seleção de assentos (token por sessão, página de espera em cache, tokens limitados ao nº de assentos, worker "porteiro" libera em lotes) — 00:34:19-00:39:28
- [ ] Avisar cedo quando os tokens acabam e sugerir outros teatros/datas — 00:39:33-00:39:57
- [ ] Proteção DoS/WAF/bots contra cambistas — 00:41:01-00:41:19
- [ ] SQL por padrão; NoSQL só com justificativa medida — 00:42:17-00:42:25 — ADR-002
- [ ] Relatórios pesados em réplica de leitura ou job em background, com resultado em cache — 00:43:00-00:44:03
- [ ] Medir antes de otimizar (métricas/profiling, atacar os maiores ofensores) — 00:45:24-00:46:26
- [ ] Suíte mínima de testes antes de mudar a arquitetura — 00:46:54-00:47:46 — ADR-010
- [ ] Não construir tudo no dia um; adicionar as peças conforme o produto cresce — 00:44:30-00:44:47 — ADR-006

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
- [x] Ver vídeo do Akita sobre como escalar uma plataforma de bilheteria

## Frontend Testing (apps/web)

- [x] Wire up Vitest config + `test` script in `apps/web/package.json`
- [x] Storybook interaction tests: add `play()` functions to existing `.stories.tsx`. The last four stories without one (`button`, `select-box`, `icon-button`, `singer-card`) now have it
- [ ] Enable a11y assertions in `.storybook/preview.tsx` (`parameters.a11y.test = 'error'`). The account stories already opt in per story (`parameters.a11y.test: "error"`); the static pages stories don't, and `footer` fails `link-name` and `not-found-view` / `about-view` fail `color-contrast` in `error` mode
- [x] Unit tests for `src/lib/` (utils, formatters, apollo helpers). Utils and formatters were already tested; `apollo-client.ts` and `cardSchema` now are too
- [x] Component tests with `@testing-library/react` + Apollo `MockedProvider` (superseded by Storybook play() tests)
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
- [x] The first Storybook run after a dependency change can fail to import while Vite re-optimizes deps. Add `optimizeDeps.include` if it shows up in CI (Not reproduced: three cold-cache runs of the storybook project passed, so no `optimizeDeps.include` was added)

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
- [x] Register a global `ValidationPipe` in `main.ts`; today only `createNestApp` registers one, so `class-validator` rules are inert in the running app. The account orders bounds don't depend on it (`AccountOrdersService.list` checks `page` / `pageSize` itself and throws `INVALID_PAGE`), but the `@IsInt` / `@IsEnum` decorators on the account inputs are inert until it exists
- [ ] Move the TypeORM `FindManyOptions` building out of `CatalogService.findEvents` into `EventRepository`
- [ ] Cap `name` / `description` in the API `eventFactory`: `faker.lorem.sentence()` sometimes overflows `description` varchar(100) and fails the 101-event e2e test (~0.25% of runs)
- [ ] Index `CatalogEventArtist.eventId`: `findHeadlinersByEventIds` filters on it on every event query, and TypeORM doesn't index FKs on Postgres
- [ ] Filter `getHomeSections` to upcoming published events: today it returns drafts and past events, whose cards link to a tickets page that answers 404

## Account Tickets (apps/web, apps/api)

Found while building `/account/tickets` (spec: `.specs/features/account-tickets/`). Branch `feat/account-tickets`.

Next account features (out of scope of the first cut):

- [ ] Refund ticket flow (Billing refund). The "Refound ticket" button on the detail page is rendered disabled; the frame also has the typo "Refound"
- [ ] Download ticket (PDF). The "Download ticket" button is rendered disabled
- [x] Notification and Setting pages: account navigation, persisted settings and notifications are implemented.
- [ ] Plans: "Upgrade your plan" / "See plans" have no behavior because no plans exist in the product
- [ ] Top bar: search, notification bell and language switcher are static (also in the public `Header`); no search or notifications backend
- [ ] Ticket scanning / entry check-in. The QR encodes the order id only (one QR per order); decide whether entry needs one QR per seat and a validation endpoint
- [ ] Store a real order reference (tracking code) instead of showing `#` + the first 8 characters of the order id
- [ ] Decide if abandoned (expired) and failed orders should ever show up, for example with a "retry payment" action. Today they are hidden by decision
- [ ] Bulk actions on the order list (the frame's card checkbox was left out because nothing uses a selection)
- [ ] Mobile layouts for the account area (frames are 1440px desktop only, like the rest of the app)

Follow-ups and debt:

- [ ] The account error screen (`app/account/error.tsx`) and the order not-found screen (`app/account/tickets/[orderId]/not-found.tsx`) show a second `Header` inside the account shell, because `RouteError` / `ResourceNotFound` go through `PageMessage`, which renders its own `Header`. Let `PageMessage` omit the header
- [ ] Move `features/checkout/api/get-checkout-page-data.ts` onto `features/auth/api/protected-page-fetch.ts`; the redirect logic exists in two places
- [ ] Billing stores the card brand lowercase (`visa`), so the web `paymentMethodLabel` capitalises it. Normalise the brand where it is stored or in the API and drop the helper workaround
- [ ] Brand primary button fails WCAG AA (white on `#C14FE6`, about 3.8:1) wherever it is used (Signup link, "Back to Homepage"). Fix the token, then drop the local colour swaps made for the account pages: tracking code and inactive tabs (`neutral-200` instead of `#454545`), "Browse Events" (`tint-600`), `TagPill` `error` variant (`error-200`)
- [ ] Pagination page numbers use `#454545` on `neutral-900` (low contrast, axe doesn't flag it)
- [ ] Pagination renders every page number (the spec asks for no ellipsis). With many pages it needs a window with ellipsis
- [ ] Pagination pill is 112px wide against Figma's 116px because the Figma pill has no auto-layout
- [ ] The Refound / Download buttons keep Figma's enabled look while carrying the native `disabled` attribute. Add a proper disabled style
- [ ] The header avatar menu (My tickets / Log out on hover) was styled from existing tokens, not from Figma. Ask design for the dropdown. Touch screens can't hover, so a tap goes straight to the tickets page; add a click toggle if mobile is built. `spec.md` still says logging out moved to the sidebar
- [ ] The Upgrade card background is four Figma layers combined into one PNG (`public/account/upgrade-plan-background.png`). Ask design for a single exported asset
- [ ] The empty-state illustration is a raster fill in Figma, so it ships as `public/account/orders-empty.png`. Replace it with an SVG if design provides one
- [ ] Figma frames disagree: gap under the header is 22px (list), 20px (detail), 24px (empty state), and the sidebar is 832px tall except 897px on the empty state. Each page builds its own content card. Align the frames
- [ ] `Header searchMode` carries both `py-4 px-27` and `py-5 px-6`; one set is dead
- [ ] Order list reads by `userId` and sorts in memory. Revisit an index on `(userId, createdAt)` and cursor-based pagination if users reach thousands of orders (see "cursor-based" above)
- [ ] `findAccountPage` counts items with a correlated subquery because TypeORM 1.x removed `loadRelationCountAndMap`. Re-check if the repository is reworked
- [ ] `pnpm install --frozen-lockfile` still fails on `zod` drift for `apps/web` (not from this feature). `qrcode.react` was added to the lockfile in the `feat: add the order qr code` commit; the lockfile is outside `apps/`
- [ ] Spec cleanups in `.specs/features/account-tickets/spec.md`: tracking code spacing (`#` + 8 characters in AC 6, `# R123` in the assumptions table), the avatar accessible name ("My account"), and how ORDDETAIL-04's HTTP 404 is evidenced
- [ ] E2E (Playwright): a signed-in user opens the account list, switches tab and sort, pages, opens a detail page, and gets a 404 for someone else's order (no automated test checks the 404 status today)

## Account Personal Info (apps/web, apps/api)

Found while verifying `/account/personal-info` (spec and report: `.specs/features/account-personal-info/`). Branch `feat/account-personal-info`.

- [ ] Birth-date calendar: pass `today` to `DayPicker` (`birth-date-picker.tsx`), so the "today" cell follows the app time zone instead of the browser clock. Its `text-primary` is 4.34:1 on `neutral-700`, below the 4.5:1 gate; the stories never show that cell, so the a11y check misses it
- [x] Phone-code story only checks that each option has an icon (`phone-code-select.stories.tsx`). Give each flag a name or `data-country` and assert it per option, so swapping two flags fails (Done: each flag icon carries `data-country`, and `Options` and `PickClosesAndReports` assert it)
- [ ] Flaky API test seen once during the build: `update-my-profile.spec.ts` computes "today" with its own clock while the server uses another, so it can fail near midnight Kiritimati time (10:00 UTC). Use the fixed-`now` service path. `user-profile-user-repository.spec.ts` also relies on a 20 ms sleep before checking `updatedAt`
- [ ] Spec wording: the missing-profile edge case says "NOT_FOUND", the code and tests use `PROFILE_NOT_FOUND`
- [ ] Visual check against Figma in a browser: profile card background (position and size of `public/account/profile-card-background.png`, the avatar's dark ring is not drawn), flags, calendar. Only Storybook play tests and a11y ran
- [ ] Spain flag icon uses a simplified crest; Figma's export is about 536 KB (578 paths). Ask design for an optimized SVG
- [ ] Calendar uses Inter; Figma uses Roboto
- [ ] Contrast substitutions to drop once the brand primary token is fixed (see the primary button item above): calendar labels `tint-400`, selected day and Save changes `tint-600`
- [ ] Shared `components/ui/input.tsx` error text moved from `error-400` to `error-300` (2.23:1 before); it affects every `Input` with an error. Fix the `error-400` token instead and revert
- [ ] Form inputs reach Figma's 56px height with `py-4! text-lg!` through `className`, and the left icon stays 18px (Figma shows 24px). Add a size variant to `Input`
- [ ] Phone menu was styled from frame `5011:120604` (`neutral-700`, `py-2`); the component's own variant is `neutral-900` with a border and `py-1`. Align the two
- [ ] Birth-date button has no `aria-invalid` (lint rejects it on a button role); the error is linked with `aria-describedby`
- [ ] "Edit" on the profile card is disabled: there is no edit mode (the form is always editable). Decide what it should do
- [ ] Avatar upload and change: the card shows `avatarUrl` or initials, nothing writes `avatarUrl`
- [ ] Email change and password change are not part of the page (Email is disabled)
- [ ] Phone country codes cover +1, +49, +34, +33 only. Extend the list and the API's `PHONE_COUNTRY_CODES` together
- [ ] The name rules are duplicated between Identity (`credential-rules.model.ts`) and User Profile (`profile-rules.model.ts`). Decide on one owner
- [ ] `APP_TIME_ZONE` is documented in `.env.default` only; add it to the deploy docs
- [ ] `apps/api/.projectStructurerc.json` now allows `__test__` in any nested module folder (added for `config/__test__/`). Narrow it to the config folder if that is too broad
- [ ] Header avatar link aria-label changed from "My account" to "Account" so it doesn't duplicate the new "My account" menu item. Check it against the avatar menu from design (`5011:120769`) and the spec cleanup in the account tickets list above
- [ ] Build gates (`next build`) need the API running on `localhost:3001` because `/` is prerendered against it. Make the build independent of a live API (static fallback or mock) so CI doesn't need it
- [ ] `pnpm --filter web codegen` only works from the repo root

## Account Payment (apps/web, apps/api)

Found while building `/account/payment` and saved cards at checkout (spec and report: `.specs/features/account-payment/`, decision: ADR-020). Branch `feat/account-payment`.

Not built (out of scope of the first cut):

- [ ] Real payment gateway (Stripe or Mercado Pago) behind the `PaymentGateway` port. Only the simulated gateway exists, and it decides outcomes from test card numbers
- [ ] 3-D Secure / `requires_action` payments for saved cards. Today a charge is `succeeded` or `failed`
- [ ] Apple Pay, bitpay and Google Pay. The three buttons on the add-card page are rendered `aria-disabled`; only Visa/card works
- [ ] Edit a saved card (holder, expiry). Today the user removes it and adds it again
- [ ] Billing address or postal code on a card
- [ ] Email or in-app notice when a card is added, removed, or set as default, and a warning before a saved card expires
- [ ] Detach every token when an account is deleted (there is no account deletion yet)
- [x] Rate limit on `addPaymentCard` and on saved-card charges, to slow card testing. Done in PR #85 (ADR-021): 5 failures in 15 minutes lock both for 15 minutes
- [ ] Throttle typed-card charges at checkout too. ADR-021 leaves them out, so a stolen card can still be tried there
- [ ] Make the 5-card limit a config value instead of a constant
- [ ] Brand logos for Mastercard and Amex in `CardPreview`; only Visa has its logo, the rest show the brand name. The checkout picker uses a generic card icon for non-Visa brands
- [ ] E2E (Playwright): add a card, set another as default, remove one, pay an order with a saved card, and pay with a new card while saving it

Follow-ups and debt:

- [ ] Reconcile orphan gateway tokens. Detach runs after the commit, so a crash in between leaves a token at the gateway with no row. A real gateway needs a periodic job
- [ ] Rotating `BILLING_FINGERPRINT_SECRET` changes every fingerprint, so duplicate checks stop matching older rows. Plan a re-key step before rotating, and add the variable to the deploy docs (like `APP_TIME_ZONE` above)
- [ ] The simulated gateway is inconsistent for `4000 0000 0000 0341`: it saves, its saved token declines, but a typed charge with the same number succeeds. Make the typed charge decline or document it in the test card list
- [ ] `router.refresh()` after `CARD_NOT_FOUND` at checkout runs as `refresh()` from `next/cache` inside `payOrderAction`, because the existing `CheckoutView` stories have no app router. Move it to `CheckoutView` once the stories get a router mock, and update `design.md`
- [ ] Checkout stories run a11y with only `color-contrast` off. The checkout fails contrast on the countdown digits, input label markers, and the Confirm / Pay buttons. Fix the brand primary token (see the primary button item above) and turn the rule back on
- [ ] "Default" and "Expired" badges are not in any Figma frame; their colors come from tokens (white on `tint-600`, white on `error-500`). Ask design
- [ ] The dashed "Add payment method" tile at `5011:121858` cannot be read through Figma (`Component set has existing errors`), so its fill, 1px `neutral-200` dashed border, and 16px radius come from the rendered frame. Fix the Figma component set and check the tile
- [ ] The empty-state illustration is a raster fill in Figma, so it ships as `public/account/payment-empty.png`. Replace it with an SVG if design provides one
- [x] No test that a removed card's past payments keep their brand and last 4. Done in PR #85. It holds because `BillingPayment` stores its own `cardBrand` / `cardLast4`
- [x] `billing-api.spec.ts` once matched a CVV substring inside a random UUID. It now compares per column, so a CVV embedded in a longer value would not be caught. No column stores free text built from card input today. Done in PR #85: the leak test now scans every text column with digit-free fixtures
- [ ] Brand is stored lowercase (`visa`) and the web casts it to `CardBrand`. Make the API return a GraphQL enum (see the brand item in Account Tickets above)
- [ ] The commit rules memory says `refactor:`, but commitlint here accepts `refac:`. One commit uses `refac:`; align the memory or the commitlint config
- [ ] Confirm lessons L-011 to L-014 (candidates in `.specs/LESSONS.md`) so the next feature loads them

## Static Pages follow-ups (apps/web)

From `.specs/features/static-pages/` (terms, about us, 404, footer links).

- [ ] Footer social icon links have `href=""` and no accessible name (`components/layouts/footer.tsx`)
- [ ] Confirm the assumptions marked `n` in the spec: `support@seatsure.com` as the support address, the typo fixes, the "Terms & Privacy Policy" heading, the `/terms` and `/about` routes, the footer link targets
- [ ] The Terms and Refund Policy copy is the Figma placeholder text with SeatSure branding. Replace it with real legal copy
- [ ] Accept / Decline on the Terms page was removed because nothing asks for consent. Add consent (for example at signup) if the product needs it
- [ ] Restyle the resource not-found pages (Artist, Event, Checkout) to match the global 404 (`ResourceNotFound` kept as is by decision)
- [ ] The 404 page has no title of its own; it falls back to the root title
- [ ] About us: real map or geolocation instead of the static map image
- [ ] Visual deltas against the frames at 1440px: 404 numerals sit lower and overlap the planet glow, the starfield is faint, the About hero mic icon differs, timeline labels 1 and 3 wrap
- [ ] Move the Terms and About copy to a CMS or API if it needs to change without a deploy
- [ ] Language switcher behavior (static control in `Header`)
- [ ] Mobile layouts for the static pages


## Account Settings follow-ups (apps/web, apps/api)

Reviewed before publishing the account settings feature.

- [ ] Add a live-session Playwright flow: change each preference, reload, log in again, and confirm that a second account remains isolated. Current API, unit and component tests cover these outcomes separately.
- [ ] Rehearse the additive UserProfileUser settings migration against existing profiles and assert all six defaults; current integration tests use an already migrated database.
- [ ] Find and close API test handles so Jest terminates without `--forceExit`; investigate the intermittent profile-test HTTP parsing error seen in the isolated verification run.
- [ ] Add desktop and narrow visual regression snapshots for settings. Current checks combine saved screenshot inspection and browser geometry assertions.
- [ ] Connect notification preferences to delivery producers with an explicit consent policy. Preferences currently persist without scheduling reminders, sending campaigns or registering push subscriptions.
- [ ] Apply preferred language to application translations and coordinate it with the header language selector. English and Portuguese (Brazil) currently persist as account preferences only.
- [ ] Design responsive account-shell layouts; the settings content wraps at narrow widths, but the shared shell remains desktop-oriented.
