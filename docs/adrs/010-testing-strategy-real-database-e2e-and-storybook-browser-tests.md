# ADR-010: Testing Strategy: Real-Database E2E for the API, Storybook Browser Tests for the Web

- **Date**: 2026-09-28 (recorded; API e2e since 2026-08-31, web setup since 2026-09-26)
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: testing, quality, e2e, storybook, vitest, jest
- **Links**:
  - [ADR-004: Frontend Technology Stack](./004-frontend-technology-stack.md)
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-007: TypeORM with Repository Encapsulation and Per-Module Migrations](./007-typeorm-with-repository-encapsulation-and-per-module-migrations.md)

## Context

A ticketing platform's worst bugs live where code meets infrastructure. Filters on "upcoming" and "published" can go wrong through timestamp semantics. Joins can pick up another event's data. Uniqueness and cascade rules can fail. On the web, interactions depend on a real browser: portals, keyboard handling, the Web Share and Clipboard APIs, and SVG accessibility. Tests against mocked repositories or jsdom would pass while those behaviors are broken. Features are specified with acceptance criteria, and each criterion needs a test that asserts its exact outcome.

## Decision

**API**: behavior is tested at the GraphQL boundary.
- Jest and supertest run e2e specs that boot only the module under test (`createNestApp([CatalogModule])`, ADR-006).
- The specs run against a real PostgreSQL test database (`seat-sure-test`, rebuilt with `pnpm --filter api test:db:reset`).
- Rows are seeded and cleaned with Knex (`testDbClient`) and `factory.ts` + Faker factories.
- Specs live in `{module}/__test__/e2e/`. Unit tests are added only once `.projectStructurerc.json` and the Jest config define a place for them.

**Web**: Vitest with two projects.
- `unit` runs pure functions (`*.test.ts`) in Node.
- `storybook` runs story `play()` functions in headless Chromium, through `@storybook/addon-vitest` and Playwright.
- Stories are the component and page test harness. Containers use Apollo `MockedProvider`.
- Playwright end-to-end flows are planned (tracked in `todo.md`).

Each acceptance criterion maps to at least one test asserting its spec-defined value. At the end of each feature, an independent verification injects deliberate faults to confirm the tests catch them.

## Consequences

### Benefits

- SQL, constraints, migrations and GraphQL wiring are exercised exactly as in production. Bugs such as a Postgres UUID cast error on malformed input show up in tests.
- Component tests run in a real browser, so focus, keyboard, portal and clipboard behavior are verified rather than simulated.
- Stories double as living documentation and as accessibility checks through the a11y addon.

### Challenges

- API e2e specs share one local database, so they run in band (`--runInBand`) and must clean up every table they touch, including tables added by new entities.
- The test database must be migrated before running the suite. A stale schema fails every test.
- Browser tests are slower than jsdom and depend on Storybook's Vite dependency cache, which occasionally fails a file's collection after re-optimization, so a rerun is needed.
- Radix portals render outside the story canvas, so play functions must query `screen`.

### Trade-offs

- Service unit tests with mocked repositories run faster and in parallel, but they miss the query and constraint bugs that matter most here.
- `@testing-library/react` in jsdom is faster and more familiar, but it can't verify real browser APIs and would duplicate the stories already written for every component.
