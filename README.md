# Seat Sure

[![CI](https://github.com/emanoelvso/seat-sure/actions/workflows/ci.yml/badge.svg)](https://github.com/emanoelvso/seat-sure/actions/workflows/ci.yml)

Seat Sure is an event ticketing app where buyers pick exact seats on a venue map and pay through a simulated checkout or, optionally, Stripe in test mode. It is a portfolio project: a NestJS GraphQL API organised as a modular monolith, a Next.js web app, and a real-database test suite. Its main engineering problem is selling the same seat to two people at once, and it comes with load-test evidence for how it behaves under a flash sale.

![Seat picker: choose two adjacent VIP seats and review the price](docs/images/seat-picker.png)

> **Live demo: [seat-sure-gamma.vercel.app](https://seat-sure-gamma.vercel.app).** A free-tier hosted instance with disposable per-visitor accounts and simulator-only payments; see [Demo mode](#demo-mode). The API sleeps when idle, so the first request after a pause can take up to a minute.

## Highlights

- **Seat-level selection.** Seat maps are SVG path data, prices are a ticket-type base plus a per-row premium, and perks (aisle, extra legroom, accessible) live on the venue seat. See [ADR-013](docs/adrs/013-seat-map-layouts-as-svg-path-data.md) and [ADR-023](docs/adrs/023-seat-prices-as-base-plus-row-premium.md).
- **No oversell.** Seats are claimed through short-lived holds owned by Ticketing ([ADR-015](docs/adrs/015-seat-holds-owned-by-ticketing.md)). Every load run, including 2,000 concurrent buyers on 500 seats, passed the oversell check, and 200 buyers racing for one seat produce exactly one winner.
- **Modular monolith with isolated state.** Six bounded contexts (identity, user profile, catalog, ticketing, billing, notifications), each with its own database and migrations, talking through public APIs ([ADR-006](docs/adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md)).
- **Tests against real infrastructure.** API tests run GraphQL requests against PostgreSQL; web components are exercised in a real browser through Storybook ([ADR-010](docs/adrs/010-testing-strategy-real-database-e2e-and-storybook-browser-tests.md)).
- **Payments handled as tokens.** Charges are authorized first and captured after the tickets are issued, with 3-D Secure supported ([ADR-024](docs/adrs/024-charges-authorized-then-captured-with-3-d-secure.md)). Saved cards are gateway tokens, card numbers and CVVs are never stored, and failed card attempts are throttled per user ([ADR-020](docs/adrs/020-saved-cards-as-gateway-tokens.md), [ADR-021](docs/adrs/021-card-operations-throttled-per-user-in-billing.md)).
- **Account deletion that cleans up the gateway.** A user can delete their account from settings; each module erases its own data, the Stripe customer is deleted, and a maintenance command finishes part-failed deletions and detaches orphan payment methods ([ADR-025](docs/adrs/025-account-deletion-and-gateway-token-reconciliation.md), [API README](apps/api/README.md#maintenance-command)).
- **Money as integer minor units**, never floats ([ADR-012](docs/adrs/012-money-as-integer-minor-units-with-currency.md)).
- **Sessions in httpOnly cookies** with short-lived JWT access tokens and rotating refresh tokens ([ADR-016](docs/adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)).

All design decisions are recorded in [`docs/adrs/`](docs/adrs/).

## Architecture

```mermaid
flowchart LR
  Buyer([Buyer]) --> Web["Web app<br/>Next.js 16 · React 19"]
  Web -- "GraphQL /graphql" --> API
  subgraph API["API · NestJS modular monolith"]
    direction TB
    IA[Identity]
    UP[User profile]
    CAT[Catalog]
    TKT[Ticketing]
    BIL[Billing]
    NOT[Notifications]
  end
  API --> DB[("PostgreSQL<br/>one database per context")]
  BIL -. "tokenize / authorize / capture" .-> GW["Payment gateway<br/>(simulated or Stripe test mode)"]
```

The C4 context, container, component and deployment diagrams are in [`docs/architecture/c4/`](docs/architecture/c4/README.md), and the bounded contexts and data model in [`docs/architecture/bounded-contexts.md`](docs/architecture/bounded-contexts.md). Redis appears in some earlier documents as a planned component; nothing in the running system uses it. [`docs/architecture/architecture.mmd`](docs/architecture/architecture.mmd) is an older microservices target, not the current system.

## Stack

| Area | Technology |
| --- | --- |
| Web | Next.js 16, React 19, Apollo Client, Tailwind CSS, Radix UI, Zod, Server Actions |
| API | NestJS, GraphQL, TypeORM, PostgreSQL 15 |
| Shared | `@seat-sure/shared` TypeScript package |
| Tests | Jest (API), Vitest and Storybook with Playwright (web), k6 (load) |
| Tooling | pnpm workspaces, Turborepo, ESLint, Husky, Commitlint, GitHub Actions, Docker |

## Run it locally

You need Node 22, pnpm 10.18.3 (`corepack enable` picks it up from `package.json`), and Docker for PostgreSQL.

```bash
pnpm install
pnpm --filter @seat-sure/shared build

# PostgreSQL 15 on localhost:5432
pnpm --filter api docker:start:deps
```

Configure the API. `apps/api/.env.default` is a template with empty values; copy it to `apps/api/.env` and fill it in (the API and its database commands load that file themselves). These variables are required, and `JWT_SECRET` and `BILLING_FINGERPRINT_SECRET` need at least 32 characters (for example `openssl rand -hex 32`):

```text
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seat-sure
REDIS_HOST=localhost        # required by the config schema; Redis is not used
REDIS_PORT=6379
JWT_SECRET=...
BILLING_FINGERPRINT_SECRET=...
AUTH_CODE_SENDER=log
```

Create the database, migrate it and start the API:

```bash
docker exec seat-sure-db psql -U postgres -c 'CREATE DATABASE "seat-sure"'
cd apps/api
pnpm db:migrate:all
pnpm dev
```

Start the web app on port 3000 in another terminal:

```bash
cd apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev
```

Open <http://localhost:3000>. The migrations load sample events, so the home page has content right away. The API allows the origin `http://localhost:3000` by default (`CORS_ORIGIN` overrides it), and `GET /health` reports its status. With the `log` code sender, sign-in codes are printed to the API console instead of being emailed.

## Tests

| Layer | Command | What it covers |
| --- | --- | --- |
| API e2e / integration | `pnpm --filter api test:db:reset && pnpm --filter api test:e2e` | GraphQL requests against the `seat-sure-test` PostgreSQL database. The reset command always targets `postgres:postgres@localhost:5432/seat-sure-test` (the local Docker database), whatever database `.env` names; the suite loads the committed `apps/api/.env.test` |
| API load harness | `pnpm --filter api test:load` | The k6 scenario outcome rules |
| Demo tooling | `pnpm --filter api test:demo` | Seed, reset, migrate and start scripts |
| Web unit | `pnpm --filter web test --project unit` | Server actions, validation, utilities |
| Web browser | `pnpm --filter web test --project storybook --no-file-parallelism --maxWorkers=1` | Components in Chromium through Storybook |
| Repository checks | `node --test scripts/release/*.test.mjs` | The forbidden-path guard and CI fixture |
| Everything | `pnpm lint && pnpm typecheck && pnpm build` | Static checks and production builds |

Browser tests need Chromium once: `pnpm --filter web exec playwright install chromium`. The [CI workflow](.github/workflows/ci.yml) runs these layers plus a redacted secret scan of the full history. CI results for this repository are not claimed here; read the badge above for the current state.

## Load-test evidence

Flash-sale behavior was measured with k6 on one machine (Apple M1 Pro, Docker Postgres, API and k6 sharing the host). The full method, raw numbers and reasoning are in [`docs/flash-sale-hardening.md`](docs/flash-sale-hardening.md), with the harness in [`apps/api/load/`](apps/api/load/README.md).

2,000 virtual buyers ramp up over 10 s and hold for 60 s against one event with 500 seats:

| Run | Hold p95 | Pay p95 | Discovery p95 | Unexpected errors | Oversell |
| --- | --- | --- | --- | --- | --- |
| Baseline, no limiter | 8,372 ms | 20,601 ms | 7,806 ms | 2.31% | none |
| Admission limit 20 | 110 ms | 125 ms | 3,803 ms | 1.62% | none |
| Admission limit 10 | 85 ms | 151 ms | 3,740 ms | 1.19% | none |

**Measured:** an admission limiter on checkout (excess work gets a retryable `BUSY` error) brought hold and pay p95 under their thresholds at low limits, and no run ever oversold a seat.

**Not met:** at every limit tried, discovery p95 and the unexpected-error rate stayed over their thresholds. The single Node process is CPU-bound at about one core, and the limiter does not cover discovery queries. Low limits also shed most holds (96.5% at limit 20), so far fewer orders complete than with the default limit of 100. The cause of the discovery connection errors is not confirmed.

**Next:** multi-process scaling, cheaper discovery and per-pool metrics are listed in the same document. Horizontal scaling on AWS with Terraform is planned separately in [#122](https://github.com/emanoelvso/seat-sure/issues/122) and has not been done.

## Demo mode

Setting `DEMO_MODE=true` (API) turns the app into a safe public sandbox: each visitor gets an independent synthetic account and a 24-hour session, normal email sign-up and password reset are rejected, only simulator cards are accepted, and mutation rates are bounded per client. The web app mirrors the flag with its own `DEMO_MODE=true` and shows a "Sign in as demo" entry plus payment instructions. Data is disposable: a guarded reset command clears visitor data and refreshes event dates. The sample events use real artist and team names purely as placeholder data; they are not affiliated with Seat Sure and no tickets are real. Details, limits and the simulator card numbers are in [`apps/api/docs/demo-runtime.md`](apps/api/docs/demo-runtime.md). The free-tier deployment runs on Vercel, Render and Neon; the runbook is in [`docs/deployment.md`](docs/deployment.md).

## Repository map

```text
apps/api/            NestJS GraphQL API (modules per bounded context, load harness, demo tooling)
apps/web/            Next.js web app (feature-based, Storybook stories next to components)
packages/shared/     Types shared by API and web
docs/adrs/           Architecture decision records
docs/architecture/   C4 diagrams, bounded contexts, data model
docs/flash-sale-hardening.md   Load-test evidence
docs/deployment.md   Free-tier deployment runbook and launch checklist
render.yaml          Render Blueprint for the demo API (variable names only)
scripts/release/     Repository checks used by CI
```

Architecture guidance for each app lives in [`apps/api/docs/`](apps/api/docs/architecture-guidelines.md) and [`apps/web/docs/`](apps/web/docs/architecture-guidelines.md).

## Credits and license

The interface design is based on the Evenjo design on [Figma](https://www.figma.com/design/Lzr6zdinjT686jQhOwpVmq/Evenjo), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The artist and event photos come from [Freepik](https://www.freepik.com) and are used under its attribution license. These materials keep their own licenses and are **not** covered by this repository's MIT license; details are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The screenshot above shows that design and those photos.

Original Seat Sure code and documentation are released under the [MIT License](LICENSE).
