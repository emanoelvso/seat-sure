# Seat Sure Web

Next.js 16 (App Router) and React 19 front end for Seat Sure. It talks to the [API](../api/README.md) over GraphQL, keeps sessions in httpOnly cookies written by server actions, and is organised by feature ([Bulletproof React](docs/architecture-guidelines.md), [ADR-008](../../docs/adrs/008-bulletproof-react-feature-based-frontend-architecture.md)). The root [README](../../README.md) has the product overview and the full local setup.

## Requirements

- Node 22 and pnpm 10.18.3 (`corepack enable`)
- Dependencies installed and the shared package built from the repository root:

```bash
pnpm install
pnpm --filter @seat-sure/shared build
```

- A running API for any page that loads data (see [the API README](../api/README.md#run-it))

## Configuration

| Variable | Where it is read | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Server and browser | Origin of the API, without a trailing slash, for example `http://localhost:3001`. Required; the app throws when it is unset. GraphQL requests go to `<origin>/graphql` |
| `NEXT_PUBLIC_TIME_ZONE` | Server and browser | IANA time zone used to format event dates; default `UTC` |
| `CLIENT_ADDRESS_SECRET` | Server only | Optional, 32+ characters, same value as the API's. When set, uncached server-side API calls forward the visitor address for per-visitor demo rate limits |
| `DEMO_MODE` | Server only | `true` replaces the email and password login with a "Sign in as demo" button and shows the simulated-payment instructions. Set it only when the API also runs with `DEMO_MODE=true` |

`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so changing them for a production build means rebuilding. Everything is read in one place, `src/config/env.ts`. The API must list the web origin in its `CORS_ORIGIN`.

## Run it

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev      # http://localhost:3000
pnpm build && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm start    # production server
```

Use the same `NEXT_PUBLIC_API_URL` for `pnpm build` and `pnpm start`.

## Sessions

Sign-in runs in server actions. They call the API, then write the access and refresh tokens as `httpOnly`, `sameSite=lax` cookies (`secure` in production). Browser code never reads a token; pages that need the signed-in user fetch it from the client so public pages stay cacheable ([ADR-016](../../docs/adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md), [ADR-017](../../docs/adrs/017-signed-in-state-loaded-on-the-client-to-keep-pages-cached.md)). A session created without "remember me" is a session cookie and ends with the browser.

## GraphQL types

Types for the operations in `src/features/*/api/` are generated from the API's `schema.gql`. After changing an operation or the API schema, start the API once (it rewrites `apps/api/schema.gql` on boot), then run:

```bash
pnpm codegen
```

The generated files live in `src/types/__generated__/` and are committed.

## Tests

```bash
pnpm test --project unit         # Vitest in Node: server actions, validation, utilities
pnpm test --project storybook    # Vitest browser mode: every story runs in Chromium
pnpm lint
pnpm typecheck
```

Install Chromium for the browser project once with `pnpm exec playwright install chromium`. The full browser suite has timing-sensitive tests; CI runs it serially with `pnpm test --project storybook --no-file-parallelism --maxWorkers=1`, and so should you if you see unexplained resize or hover timeouts.

Component behaviour is tested through stories (`*.stories.tsx` next to the component) rather than with a DOM simulator ([ADR-010](../../docs/adrs/010-testing-strategy-real-database-e2e-and-storybook-browser-tests.md)). To browse the stories while you work:

```bash
pnpm storybook                   # http://localhost:6006
pnpm build-storybook             # static build
```

## Layout

```text
src/app/          Routes, layouts and route-level loading and error states
src/features/     One folder per feature (auth, checkout, events, tickets, account, ...)
src/components/   Shared UI components
src/config/       Environment and route paths
src/lib/          GraphQL clients
src/types/        Shared types and the generated GraphQL types
```

Architecture rules, including where code may import from, are in [docs/architecture-guidelines.md](docs/architecture-guidelines.md).
