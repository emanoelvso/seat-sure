# ADR-009: pnpm Workspaces and Turborepo Monorepo

- **Date**: 2026-09-28 (recorded; in effect since 2026-08-31)
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, monorepo, pnpm, turborepo, tooling
- **Links**:
  - [ADR-004: Frontend Technology Stack](./004-frontend-technology-stack.md)
  - [ADR-005: NestJS as the Backend Framework](./005-nestjs-as-backend-framework.md)

## Context

Seat Sure is a TypeScript product with a Next.js web app and a NestJS API (ADR-004, ADR-005). A feature usually touches both sides at once, such as a new GraphQL query and the page that consumes it. ADR-005 also counts on a shared type contract between frontend and backend. Separate repositories would split every feature into coordinated pull requests and duplicate tooling setup.

## Decision

We will keep everything in **one repository**, managed with **pnpm workspaces** and **Turborepo**:

- Workspaces: `apps/*` (`api`, `web`) and `packages/*` (`@seat-sure/shared`), declared in `pnpm-workspace.yaml`. pnpm is pinned through `packageManager`.
- Root tasks `build`, `dev`, `lint`, `typecheck` and `test` run through `turbo run`, with `dependsOn: ["^build"]` so shared packages build before the apps that use them. `build` and `test` outputs are cached.
- Code or types used by both API and web go into `packages/shared` and are consumed as `workspace:*` dependencies.

## Consequences

### Benefits

- A feature that spans API and web lands as one reviewable change on one branch.
- One lockfile and one install for the whole product. Turborepo's cache skips unchanged packages.
- The shared package gives the web app and the API a single definition for contracts that must match.

### Challenges

- `apps/web` has its own `pnpm-workspace.yaml`, so Vite needs `server.fs.allow` pointed at the monorepo root to serve hoisted dependencies (`apps/web/vitest.config.ts`).
- `apps/api` has no `lint` script, so `turbo run lint` skips it, and its husky pre-commit hook still calls `yarn` (tracked in `todo.md`).
- `@seat-sure/shared` holds only a placeholder `User` type today. GraphQL types are hand-written on the web side until GraphQL Code Generator is adopted (ADR-001).

### Trade-offs

- Separate repositories would give independent release cycles, which this product doesn't need, at the cost of cross-repo coordination for every feature.
- Nx offers richer generators and dependency-graph rules, but Turborepo plus pnpm covers task orchestration and caching with far less configuration.
