# ADR-008: Bulletproof React Feature-Based Architecture for the Web App

- **Date**: 2026-09-27
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, frontend, nextjs, bulletproof-react, project-structure
- **Links**:
  - [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md)
  - [ADR-004: Frontend Technology Stack](./004-frontend-technology-stack.md)
  - [`apps/web/docs/architecture-guidelines.md`](../../apps/web/docs/architecture-guidelines.md)
  - [Bulletproof React](https://github.com/alan2207/bulletproof-react)

## Context

ADR-004 chose the frontend stack but not how code is organized. The web app grew flat:
- 34 components (plus 12 icons) in `src/components/`
- GraphQL documents in `src/graphql/`
- utilities in `src/lib/utils/`
- page containers (`Artist.tsx`, `EventTickets.tsx`) inside `src/app/`

Nothing stops one product area from importing another's internals. Pages were also built as client-side Apollo containers, while ADR-001 expects public pages to render on the server with ISR. Without a structure, the upcoming checkout, auth and account areas would make this coupling worse.

## Decision

We will organize `apps/web` following **Bulletproof React**, adapted to the Next.js 16 App Router:

- **Routes only in `src/app/`**: route folders hold Next.js files only. Pages read params, fetch first-render data on the server, and compose features.
- **Features in `src/features/<name>/`** (`api/`, `components/`, `hooks/`, `utils/`, …): a feature never imports from another feature. Code needed by two features moves to the shared folders.
- **Shared folders**: `components/ui`, `components/layouts`, `hooks`, `lib`, `config`, `types`, `utils` and `testing`.
- **One-way imports** (shared → features → app), enforced by ESLint `import/no-restricted-paths`.
- **API layer**: requests are declared per feature, on top of one Apollo client (Client Components) and one server fetcher (Server Components).
- **Server Components by default**, with `"use client"` only at interactive leaves. Server data stays in its cache, and filters and pagination live in the URL.
- **Conventions**: kebab-case files, named exports, no barrel files.

Existing code migrates incrementally (tracked on the [project board](https://github.com/users/emanoelvso/projects/3)). New code follows the structure.

## Consequences

### Benefits

- Each product area can be added, moved or deleted without tracing imports across the app, and lint catches boundary violations.
- Features line up with backend bounded contexts (ADR-006), which makes ownership and API contracts easier to follow.
- Server-first rendering puts ADR-001's ISR strategy into practice and reduces client JavaScript.

### Challenges

- Until the migration is done, two structures coexist, and contributors must know that old folders are frozen.
- Two data clients (server fetcher and Apollo) mean two caching models. It is still unconfirmed whether Next's fetch cache applies to GraphQL `POST` requests (tracked on the [project board](https://github.com/users/emanoelvso/projects/3)).
- Pages already built client-side (artist, tickets) must move their first render to the server, and the tickets filters to URL search params.

### Trade-offs

- A flat `components/` folder is simpler for a small app, but it gives no ownership or boundaries as the product grows.
- Putting everything under `src/app/` route segments (colocation) keeps code close to routes, but it breaks down when two routes share a feature, such as the seat map used by checkout and by event detail.
