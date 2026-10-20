# Seat Sure API

NestJS GraphQL API for Seat Sure, organised as a modular monolith. Six bounded contexts (`identity`, `user-profile`, `catalog`, `ticketing`, `billing`, `notifications`) each own their tables, TypeORM datasource and migrations on one PostgreSQL server, and call each other only through public APIs. The root [README](../../README.md) has the product overview and the full local setup; this file covers API-specific setup and operation.

## Requirements

- Node 22 and pnpm 10.18.3 (`corepack enable`)
- Docker, for PostgreSQL 15
- Dependencies installed and the shared package built from the repository root:

```bash
pnpm install
pnpm --filter @seat-sure/shared build
```

## Configuration

Configuration is read from environment variables and validated at startup with a Zod schema (`src/module/shared/module/config/util/config.schema.ts`); the process exits with a value-free error if anything is missing. `.env.default` is a template with empty values. Copy it to `.env` and fill it in. The tests load the committed `.env.test` themselves; the migration commands read `.env`, and `test:db:reset` ignores it for the connection.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | HTTP port (the container image uses 3001) |
| `DATABASE_URL` | PostgreSQL URL; takes precedence over the host, name, user and password variables. `?sslmode=require` (or `verify-full`) enables verified TLS; `DATABASE_SSL=true` does too |
| `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_PORT` | Used when `DATABASE_URL` is not set |
| `REDIS_HOST`, `REDIS_PORT` | Required by the schema. Redis is not used by the running system |
| `JWT_SECRET` | Signs access tokens; at least 32 characters |
| `BILLING_FINGERPRINT_SECRET` | HMAC key for card fingerprints; at least 32 characters |
| `BILLING_GATEWAY` | `simulated` (default) or `stripe`. See [Payments](#payments) |
| `STRIPE_SECRET_KEY` | Stripe test-mode secret key (`sk_test_` or `rk_test_`). Required when `BILLING_GATEWAY=stripe`; a live key is rejected at startup |
| `AUTH_CODE_SENDER` | `log` (prints one-time codes to the console; rejected in production) or `disabled` (demo mode only) |
| `CORS_ORIGIN` | Allowed web origin; defaults to `http://localhost:3000` |
| `APP_TIME_ZONE` | IANA time zone, default `UTC` |
| `ADMISSION_MAX_CONCURRENT` | Concurrent `startCheckout` and `payOrder` calls before the excess gets a retryable `BUSY` error; default 100 (see [ADR-022](../../docs/adrs/022-flash-sale-concurrency-hardening.md)) |
| `CLIENT_ADDRESS_SECRET` | Optional, at least 32 characters. Shared with the web app so the demo rate limit can use the visitor address it forwards |
| `TRUST_PROXY` | Comma-separated proxy IPs or CIDR ranges allowed to set forwarding headers; empty by default |
| `DEMO_MODE`, `DEMO_MAX_REQUESTS`, `DEMO_WINDOW_MS`, `DEMO_MAX_BUCKETS` | Demo mode and its rate limit, see [Demo mode](#demo-mode) |

In production the two secrets must be at least 32 characters and must not be a single repeated character or contain placeholder words such as `change-me`, `example`, `default` or `test-secret`.

## Payments

Charges are authorized, then captured after the tickets are issued, and a charge can pause on 3-D Secure ([ADR-024](../../docs/adrs/024-charges-authorized-then-captured-with-3-d-secure.md)). `BILLING_GATEWAY` picks who handles the money:

- `simulated` (default): no network. `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines, `4000 0000 0000 0341` saves but declines every charge, and `4000 0027 6000 3184` asks for 3-D Secure (a "Test bank" dialog with Approve and Fail).
- `stripe`: Stripe test mode. Set `STRIPE_SECRET_KEY` to your test key and the web app's `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (see [the web README](../web/README.md#configuration)). Stripe's test cards work: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines and `4000 0027 6000 3184` asks for 3-D Secure.

`pnpm test:stripe-sandbox` is an opt-in smoke test against Stripe's test mode. Run it with `STRIPE_SECRET_KEY=sk_test_... pnpm test:stripe-sandbox`; without a test key it skips and succeeds. `pnpm test`, `pnpm test:e2e` and CI never call Stripe.

## Maintenance command

`deleteMyAccount` erases the user's data in every module and, with Stripe, deletes the Stripe customer ([ADR-025](../../docs/adrs/025-account-deletion-and-gateway-token-reconciliation.md)). If a step fails, the account is already unusable (sign-in and tokens are refused) and the deletion stays pending. One command finishes it and also cleans up Stripe:

```bash
pnpm build
pnpm maintenance        # runs dist/maintenance.main.js; from the repository root: pnpm --filter api maintenance
pnpm maintenance:dev    # the same without a build (nest start --entryFile maintenance.main)
```

It needs the same variables as the server (`DATABASE_URL`, `BILLING_GATEWAY`, and `STRIPE_SECRET_KEY` for Stripe) and does two jobs in order:

1. **Finishes pending account deletions.** It re-runs every erasure step of each pending deletion and removes the identity row once all steps pass.
2. **Detaches orphan Stripe payment methods.** For every customer Billing knows, it lists the card payment methods attached at Stripe and detaches each one that has no saved-card or pending-card row and was created more than 24 hours earlier. The 24 hours leave room for a card that is being added. With `BILLING_GATEWAY=simulated` it makes no gateway call and reports zero counts.

A failure in one job does not skip the other. A failure for one Stripe customer does not skip the next one. The command logs the counts of both jobs when it finishes (counts only; it never logs a token, payment-method id or Stripe customer id) and exits `0` when nothing failed or `1` when any step failed, so a scheduler can alert on the exit code.

Run it as often as you like; every step is idempotent and overlapping runs are safe. No scheduler is configured: the Render free plan has no cron jobs, so run it by hand or from any scheduler you already have (for example a daily job).

## Run it

```bash
pnpm docker:start:deps                      # PostgreSQL 15 on localhost:5432
docker exec seat-sure-db psql -U postgres -c 'CREATE DATABASE "seat-sure"'
pnpm db:migrate:all                         # all six contexts
pnpm dev                                    # watch mode
```

`pnpm build` followed by `pnpm start:prod` runs the compiled server. `GET /health` returns `{"status":"ok"}` without authentication, and the GraphQL endpoint is `/graphql`. The schema is generated into `schema.gql`; the web app's generated types come from it (`pnpm --filter web codegen`).

## Database and migrations

Each context has its own migration history, so every command exists per context (`catalog`, `ticketing`, `user-profile`, `identity`, `billing`, `notifications`):

```bash
pnpm catalog:db:generate   # generate a migration from entity changes
pnpm catalog:db:migrate    # run pending migrations
pnpm catalog:db:drop       # drop the schema
pnpm db:generate:all       # the same, for every context
pnpm db:migrate:all
pnpm db:drop:all
```

The catalog migrations load sample events, so a freshly migrated database already has events to browse.

## Tests

```bash
pnpm test:db:reset   # drop and migrate postgres:postgres@localhost:5432/seat-sure-test, whatever database .env names
pnpm test:e2e        # GraphQL requests against real PostgreSQL, one process
pnpm test:load       # unit tests of the k6 scenario outcome rules
pnpm test:demo       # seed, reset, migrate and start scripts, on throwaway databases
pnpm lint
pnpm typecheck
```

Tests run against a real database instead of mocks ([ADR-010](../../docs/adrs/010-testing-strategy-real-database-e2e-and-storybook-browser-tests.md)). The container smoke test (`node --test apps/api/container/smoke.test.mjs`, run from the repository root) builds the production image and checks `/health`.

## Demo mode

`DEMO_MODE=true` makes the API a safe public sandbox: one synthetic account and a 24-hour session per visitor (`demoSignIn`), ordinary email sign-up and password reset rejected with `DEMO_ONLY`, only simulator cards accepted, and mutations rate limited per client. Use `AUTH_CODE_SENDER=disabled` with it.

The demo scripts work on a dedicated database whose name contains the word `demo` (for example `seat-sure-demo`) and refuse names containing `test`, `prod` or `production`. You confirm the target by setting `DEMO_DATABASE_NAME` to the exact database name:

```bash
export DEMO_MODE=true DEMO_DATABASE_NAME=seat-sure-demo
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seat-sure-demo
pnpm demo:migrate   # compiled migrations for all contexts (needs pnpm build first)
pnpm demo:seed      # an original, repeatable sample event; also moves stale event dates forward
pnpm demo:reset     # delete visitor and purchase data, rebuild the sample event, refresh event dates
pnpm demo:start     # migrate, seed, then start the compiled server; stops at the first failure
```

Limits, the proxy setting and the simulator card numbers are documented in [docs/demo-runtime.md](docs/demo-runtime.md).

## Container image

The image builds from the repository root, because it needs the workspace lockfile and the shared package:

```bash
docker build -f apps/api/Dockerfile -t seat-sure-api .
```

It installs production dependencies only, runs as a non-root user and listens on port 3001. Pass the variables from [Configuration](#configuration) at run time; none are baked into the image.

## Load tests

[`load/README.md`](load/README.md) describes the k6 contention and spike scenarios. The measured results and their limits are in [docs/flash-sale-hardening.md](../../docs/flash-sale-hardening.md).

## Architecture documents

- [Architecture guidelines](docs/architecture-guidelines.md) and [feature folders](docs/feature-folders-guidelines.md)
- [Modular architecture principles](docs/modular-architecture-principles.md)
- [Bounded contexts and data model](../../docs/architecture/bounded-contexts.md)
- [ADRs](../../docs/adrs/)
