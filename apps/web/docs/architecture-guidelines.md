# Architecture Guidelines

How the Seat Sure frontend is organized. Based on [Bulletproof React](https://github.com/alan2207/bulletproof-react), adapted to the Next.js 16 App Router and the stack in [ADR-004](../../../docs/adrs/004-frontend-technology-stack.md) (React 19, Tailwind v4, CVA, Radix UI, Storybook) and the data strategy in [ADR-001](../../../docs/adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md) (GraphQL, Apollo Client, ISR).

- All paths are relative to `apps/web/`.
- Code samples are condensed from the files they name.
- For React and Next.js coding patterns, use the `vercel-react-best-practices` and `vercel-composition-patterns` skills. For Next.js 16 APIs, read the guides in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Rules at a Glance

These are mandatory. The rest of this document explains each one.

1. **Routes only in `src/app/`**: route folders hold Next.js files only. Pages read params, fetch first-render data, and compose features. ([The `app/` Folder](#the-app-folder))
2. **Features are isolated**: `src/features/<name>/` never imports from another feature. Pages combine features. Code needed by two or more features moves to a shared folder. ([Features](#features))
3. **Imports flow one way**: shared folders → `features` → `app`. Enforced by ESLint. ([Unidirectional Imports](#unidirectional-imports))
4. **API requests are declared per feature** in `features/<name>/api/`, on top of one Apollo client and one server fetcher in `src/lib/`. ([API Layer](#api-layer))
5. **Server Components by default**: `"use client"` only on the components that need state, effects, or browser APIs. Public pages render on the server with ISR. ([Server & Client Components](#server--client-components))
6. **Server data stays in its cache** (Next.js fetch cache or Apollo cache), never copied into `useState` or context. Filters and pagination live in the URL. ([State Management](#state-management))
7. **No barrel files**: import files directly, never through an `index.ts`. ([Project Standards](#project-standards))
8. **kebab-case files and folders, named exports**, except Next.js special files. ([Project Standards](#project-standards))
9. **Shared UI** is built from Radix primitives, Tailwind theme tokens, and CVA variants, with a colocated Storybook story. ([Components & Styling](#components--styling))

---

## Project Structure

```
apps/web/
├── .storybook/
├── docs/
├── public/
└── src/
    ├── app/                # Next.js App Router: routes, layouts, route-level error/loading UI
    │   ├── provider.tsx    # Global client providers (nuqs, Apollo), used by the root layout
    │   └── globals.css     # Tailwind v4 entry + @theme tokens
    ├── components/         # Shared components
    │   ├── ui/             # Design-system primitives (button, input, select-box, ...)
    │   ├── layouts/        # header, footer
    │   └── icons/          # Custom SVG icons
    ├── config/             # env.ts (validated env vars), paths.ts (route builders)
    ├── features/           # Feature modules
    ├── hooks/              # Shared hooks
    ├── lib/                # Preconfigured libraries (Apollo client, server GraphQL fetcher)
    ├── testing/            # Test utilities, mocks, and fixtures
    ├── types/              # Shared types (api.ts: entities used by several features; __generated__/: codegen output)
    └── utils/              # Shared pure functions (dates, share, search-param parsers)
```

### The `app/` Folder

Route folders contain only Next.js files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts`. The only other files are `provider.tsx` and `globals.css` at the root.

A page:

1. Reads `params` / `searchParams` (Promises in Next.js 16)
2. Fetches the data for the first render on the server
3. Renders features, passing data between them via props

```tsx
// src/app/events/[id]/tickets/page.tsx
import { notFound } from "next/navigation";
import { Footer } from "@/components/layouts/footer";
import { getEventTickets } from "@/features/tickets/api/get-event-tickets";
import { EventTicketsView } from "@/features/tickets/components/event-tickets-view";

export default async function EventTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventTickets = await getEventTickets(id);

  if (!eventTickets.event) notFound();

  return (
    <>
      <main>
        <EventTicketsView eventTickets={eventTickets} />
      </main>
      <Footer />
    </>
  );
}
```

### Features

A feature is a self-contained area of the product. Create only the folders it needs:

```
src/features/tickets/
├── api/            # GraphQL documents, types, server fetchers, client hooks
├── components/     # UI scoped to this feature, with colocated stories
├── hooks/          # Hooks scoped to this feature
├── stores/         # Client state scoped to this feature (only if needed)
├── types/          # Types used only inside this feature
└── utils/          # Pure functions, with unit tests in utils/__tests__/
```

| Feature        | Owns                                                   | Backend context      |
| -------------- | ------------------------------------------------------ | -------------------- |
| `events`       | Home sections, event listing and filters, search       | Catalog              |
| `artists`      | Artist page and artist cards                           | Catalog              |
| `tickets`      | Seat map, ticket listings, price/quantity filters      | Catalog, Ticketing   |
| `testimonials` | Testimonial cards and carousel                         | Social Proof         |
| `faq`          | FAQ section                                            | —                    |
| `auth`         | Login, signup, code verification, password reset, session cookies | Identity & Access, User Profile |
| `account`      | Account area: my tickets and order detail, personal info, saved payment cards, notifications, notification and language settings, sidebar | Ticketing, User Profile, Billing, Notifications |
| `checkout`     | Checkout steps, payment form, saved card picker, order confirmation | Ticketing, Billing |

Add features as new product areas appear. Card utilities (`src/utils/card.ts`, `card-schema.ts`) and `CardPreview` live in the shared folders because both `account` and `checkout` use them. Features are organized by UI area; they usually line up with a backend bounded context but don't have to.

**Rules:**

- ❌ A feature never imports from another feature. Lint enforces it.
- ✅ When a second feature needs something, move it to the shared folders: components to `src/components/`, entity types to `src/types/api.ts`, pure functions to `src/utils/`. Shared code receives data through props and arguments; it never imports feature code.
- ✅ When a page needs two features to interact, the page wires them together (props, callbacks, or URL state).

### Shared Folders

| Folder               | Holds                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| `components/ui/`     | Primitives with no business meaning: `Button`, `Input`, `SelectBox`, `TagPill`  |
| `components/layouts/`| `Header`, `Footer`, page shells                                                 |
| `components/icons/`  | Custom SVG icons not available in `@solar-icons/react`                          |
| `components/`        | Domain-flavored components used by several features (e.g. an event card)       |
| `hooks/`             | Hooks used by several features                                                 |
| `lib/`               | Configured library instances: `apollo-client.ts`, `graphql-server.ts`          |
| `config/`            | `env.ts` (the only place that reads `process.env`), `paths.ts`                  |
| `types/`             | `api.ts` for entities shared across features, `__generated__/` for codegen output |
| `utils/`             | Pure, framework-free functions (`event-format.ts`, `share.ts`, `search-params.ts`) |
| `testing/`           | Test helpers, mocks, and fixtures (`seat-map.fixture.ts`)                       |

Types that the API and the web app both need can go in the `@seat-sure/shared` workspace package (`packages/shared`).

### Unidirectional Imports

```
components, hooks, lib, types, utils, config  →  features  →  app
```

- `app` can import from anything.
- `features` can import from shared folders, not from `app` or other features.
- Shared folders can't import from `features` or `app`.

This is enforced by `import/no-restricted-paths` in `eslint.config.mjs`. Cross-feature restrictions are generated from the folder names in `src/features/`, so a new feature is covered automatically.

---

## API Layer

Bulletproof's rule: one API client, and every request declared up front next to the feature that uses it. Seat Sure has two clients, because ADR-001 renders public pages on the server and uses Apollo on the client:

| Client                         | Used by           | Caching                                    |
| ------------------------------ | ----------------- | ------------------------------------------ |
| `src/lib/graphql-server.ts`    | Server Components | Next.js fetch cache (`revalidate`, `tags`) |
| `src/lib/apollo-client.ts`     | Client Components | Apollo `InMemoryCache`                     |

### Request Declarations

Each GraphQL operation gets its own files in `features/<name>/api/`:

| File                     | Contains                              | Imported by                    |
| ------------------------ | ------------------------------------- | ------------------------------ |
| `{operation}.ts`         | Typed `gql` document + derived result types | Both                      |
| `get-{resource}.ts`      | Server fetcher                        | Server Components only         |
| `use-{resource}.ts`      | Apollo hook                           | Client Components only         |
| `{operation}-action.ts`  | Server Action (`"use server"`) for a form ([ADR-019](../../../docs/adrs/019-forms-with-server-actions-and-zod.md)) | Client form components         |

This split adapts Bulletproof's one-file-per-request pattern to Server Components: the document file is safe in both environments, while fetchers and hooks each stay on their side of the boundary. Create only the consumers you need.

```ts
// src/features/tickets/api/find-event-tickets.ts (condensed)
import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  FindEventTicketsQuery,
  FindEventTicketsQueryVariables,
} from "@/types/__generated__/graphql";

export const FIND_EVENT_TICKETS: TypedDocumentNode<
  FindEventTicketsQuery,
  FindEventTicketsQueryVariables
> = gql`
  query FindEventTickets($input: FindEventTicketsInput!) {
    findEventTickets(FindEventTicketsInput: $input) {
      event { id name type coverImage venue city country startAt endsAt }
      seatMap { ... }
      ticketTypes { id sectionKey name priceCents currency seatsAvailable maxPerOrder tags }
    }
  }
`;

// Operation-specific types derived from the generated ones
export type FindEventTickets = FindEventTicketsQuery["findEventTickets"];
export type TicketType = FindEventTickets["ticketTypes"][number];
```

```ts
// src/features/tickets/api/get-event-tickets.ts
import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_EVENT_TICKETS } from "@/features/tickets/api/find-event-tickets";

export async function getEventTickets(eventId: string) {
  const data = await graphqlServerFetch(
    FIND_EVENT_TICKETS,
    { input: { eventId } },
    { tags: [`event:${eventId}`] },
  );

  return data.findEventTickets;
}
```

```ts
// Shape of a client hook (no feature needs one yet)
// src/features/tickets/api/use-event-tickets.ts
import { useQuery } from "@apollo/client/react";
import { FIND_EVENT_TICKETS } from "@/features/tickets/api/find-event-tickets";

export function useEventTickets(eventId: string) {
  return useQuery(FIND_EVENT_TICKETS, {
    variables: { input: { eventId } },
  });
}
```

### Server Fetcher

```ts
// src/lib/graphql-server.ts (condensed)
import "server-only";
import type { TypedDocumentNode } from "@apollo/client";
import { print } from "graphql";
import { env } from "@/config/env";

export async function graphqlServerFetch<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  { revalidate = 60, tags }: CacheOptions = {},
): Promise<TData> {
  const response = await fetch(`${env.apiUrl}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: print(document), variables }),
    next: { revalidate, tags },
  });

  const body = await response.json().catch(() => ({}));
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }
  return body.data;
}
```

- `import "server-only"` makes `next build` fail if a Client Component imports the fetcher, directly or through a `get-*` file.
- `accessToken` adds `Authorization: Bearer <token>` for protected operations. Only server code reads the token, from its `httpOnly` cookie ([ADR-016](../../../docs/adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)).
- GraphQL errors throw a `GraphQLRequestError { message, code, reason, fields }`: `code` is `extensions.code`, `reason` and `fields` come from `extensions.originalError` ([ADR-018](../../../docs/adrs/018-business-errors-as-unprocessable-entity-with-a-reason-code.md)). It extends `Error`, so callers that only need the message don't change.
- **Mutations always pass `revalidate: 0`.** With the default `revalidate: 60`, a POST is cached by its body (see the next bullet).
- The project uses Next.js 16's previous caching model (`cacheComponents` is off), where `fetch` is uncached unless `cache` or `next.revalidate` is set. **POST requests with an explicit `next.revalidate` are cached**: in Next 16.2.10, `patch-fetch.js` only turns a POST into "auto no cache" when the fetch has no cache config, and the Data Cache key includes the request body (`incremental-cache/index.js`, `generateCacheKey`), so each query and its variables get their own entry.

### Types

- GraphQL types are generated by GraphQL Code Generator (`codegen.ts`) from `apps/api/schema.gql`, which the API writes on boot. After an API schema change, boot the API, then run `pnpm --filter web codegen`. Codegen fails on a field the schema doesn't have.
- The output lives in `src/types/__generated__/` (lint-ignored, never edited by hand): `graphql.ts` holds the operation types (`FindEventTicketsQuery`, `…QueryVariables`), `schema.ts` the schema types (`Event`).
- Each document is annotated as `TypedDocumentNode<…Query, …QueryVariables>`, so `graphqlServerFetch` and `useQuery` infer their types without generics.
- Operation-specific types are derived in the operation file (`TicketType = FindEventTickets["ticketTypes"][number]`); entities used by several features live in `src/types/api.ts` (`EventSummary`, a `Pick` of the generated `Event`).

---

## Server & Client Components

- ✅ **Server Components by default.** Pages and non-interactive sections render on the server.
- ✅ **`"use client"` at the leaves.** Mark the filter bar or the seat map as a client component, not the whole page.
- ✅ **First render from the server.** Public pages (home, events, event detail, artist) fetch on the server with `revalidate` (ADR-001 ISR) and pass data down as props. Client components take over for interaction: filtering, pagination, seat selection.
- ✅ **Personalized UI on cached pages loads on the client.** Shared chrome (the header) never reads session cookies while rendering, or every page would lose ISR. It fetches the uncached `/api/auth/session` Route Handler after mount ([ADR-017](../../../docs/adrs/017-signed-in-state-loaded-on-the-client-to-keep-pages-cached.md)).
- ✅ **Serializable props.** Props passed from Server to Client Components must be plain data: no functions or class instances; dates as ISO strings.
- ❌ Never import a `get-*` server fetcher into a Client Component, or a `use-*` hook into a Server Component.
- ❌ Never read `process.env` outside `src/config/env.ts`. Only `NEXT_PUBLIC_*` variables reach the browser.
- ✅ **Dates in one time zone.** Event dates and times are formatted in `env.timeZone` (`NEXT_PUBLIC_TIME_ZONE`, `UTC` when unset) with the helpers in `src/utils/event-format.ts`, so the server HTML and the browser's hydration render the same text. Never format an event date in the runtime's local zone. Values that depend on the current time (`now`, countdowns) come from the server as props or render only after mount.

---

## State Management

Bulletproof splits state into five categories. Pick the category first, then the tool:

| Category          | Examples                                   | Seat Sure                                                                                   |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Component state   | Open/closed dropdown, hovered seat         | `useState` / `useReducer`                                                                   |
| Application state | Signed-in user, global modals              | Signed-in user: `HeaderAccount` fetches `/api/auth/session` after mount ([ADR-017](../../../docs/adrs/017-signed-in-state-loaded-on-the-client-to-keep-pages-cached.md)). Otherwise React Context, only when prop drilling hurts. No global store library until one is needed. |
| Server cache      | Events, artists, ticket types              | Next.js fetch cache (server), Apollo `InMemoryCache` (client)                               |
| Form state        | Checkout, login                            | Server Actions + `useActionState` + zod schemas in `features/<name>/utils/`; no React Hook Form ([ADR-019](../../../docs/adrs/019-forms-with-server-actions-and-zod.md)) |
| URL state         | Filters, sort order, pagination, selected tab | `nuqs` parsers shared by the server page and client leaves (see [URL State](#url-state))  |

- ✅ Keep state as close as possible to where it's used.
- ✅ Derive values instead of syncing them: compute filtered listings from data and filters on render, don't store them.
- ✅ Put filters and pagination in the URL so results are shareable and survive a refresh.
- ❌ Don't copy query results into `useState` or context; read them from the cache.

### URL State

URL state goes through [nuqs](https://nuqs.dev). `AppProvider` wraps the app in its `NuqsAdapter`.

- Each feature declares its params once in `features/<name>/utils/{name}-search-params.ts` (`events-search-params.ts`, `tickets-search-params.ts`). These files import from `nuqs/server`, which has no `"use client"` directive, so server pages and client components can both use them.
- Server pages read the params with the feature's loader (`loadEventsSearchParams(searchParams)`) and build links with its serializer.
- Client leaves read and write them with `useQueryStates` from `nuqs`, with `history: "replace"`. Use `shallow: false` when the server must refetch (`EventsFilters`), and the default shallow update when the page filters data it already has (`EventTicketsView`).
- An invalid param reads as unset, so the default applies. Integer params use `parseAsStrictInteger` from `src/utils/search-params.ts`: nuqs's `parseAsInteger` uses `parseInt` and reads `1.5` as `1`.

---

## Components & Styling

### Components

- ✅ **Colocate**: a component lives in its feature until a second feature needs it.
- ✅ **Extract, don't nest render functions**: a piece of UI that's a unit becomes its own component.
- ✅ **Few props, more composition**: prefer `children` and slots over boolean props (see `vercel-composition-patterns`).
- ✅ **Presentational shared components**: components in `src/components/` take data through props and don't fetch.

```tsx
// ❌ Hard to maintain as it grows
function TicketList() {
  function renderListing(listing: Listing) {
    return <li>...</li>;
  }
  return <ul>{listings.map(renderListing)}</ul>;
}

// ✅ Extract the unit
function TicketListing({ listing }: { listing: Listing }) {
  return <li>...</li>;
}

function TicketList() {
  return (
    <ul>
      {listings.map((listing) => (
        <TicketListing key={listing.id} listing={listing} />
      ))}
    </ul>
  );
}
```

### Styling

- **Radix UI** provides behavior and accessibility for interactive primitives (dialogs, popovers, selects).
- **Tailwind v4** for styling. Use the tokens declared in `@theme` in `src/app/globals.css` (`bg-primary`, `text-tint-400`, `bg-shade-500`, `text-error-300`). Don't use arbitrary values like `text-[#999999]`; add a token instead.
- **CVA** for component variants:

```tsx
// Condensed from src/components/ui/button.tsx
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg gap-2 transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary hover:bg-tint-400 text-white",
        outline: "border border-primary text-primary hover:border-tint-400",
        ghost: "text-primary hover:text-tint-400",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4 py-2", lg: "h-12 px-8" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
```

- **Icons**: `@solar-icons/react` first; custom SVGs in `src/components/icons/`.
- **Images and fonts**: `next/image` (remote hosts in `next.config.ts` `remotePatterns`) and `next/font` (Inter, set in the root layout).

### Storybook

- Every shared UI component, and every feature component with meaningful states, has a colocated `{name}.stories.tsx`.
- Stories run as tests through `@storybook/addon-vitest`; the a11y addon must pass.

---

## Error Handling

- **Route level**: data-fetching route segments get an `error.tsx` and, where a resource can be missing, a `not-found.tsx`. Call `notFound()` when the API returns `null`.
- **No `loading.tsx` on routes that can call `notFound()`** (`/artists/[slug]`, `/events/[id]/tickets`). A `loading.tsx` starts streaming a 200 response before the page runs, so `notFound()` could no longer answer 404. These pages wait for their (usually cached) data instead.
- **Feature level**: Client Components handle Apollo's `error` with a fallback inside the feature, so one failing section doesn't blank the page.
- **Server fetches**: `graphqlServerFetch` throws on GraphQL errors, which renders the nearest `error.tsx`.
- **Server Actions** catch `GraphQLRequestError`, map its `reason` to the feature's own copy, and return it as field or form errors. They never show the API's `message` to users ([ADR-018](../../../docs/adrs/018-business-errors-as-unprocessable-entity-with-a-reason-code.md)).
- **Future**: error tracking (e.g. Sentry) in production.

---

## Security

- **Authentication** ([ADR-016](../../../docs/adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)): the API expects `Authorization: Bearer <JWT>` (ADR-001) and never sets cookies. The Next.js server keeps the access and refresh tokens in `httpOnly`, `SameSite=Lax`, `Secure` (production) cookies, written only by Server Actions and Route Handlers (`features/auth/api/session-cookies.ts`). Tokens never reach client code or `localStorage`.
- **Refreshing**: `/api/auth/session` (`features/auth/api/get-session.ts`) refreshes an expired access token and clears the cookies of a dead session. Server Components can't write cookies, so they never refresh.
- **Redirect targets** after signing in go through `safeRedirect` (paths starting with exactly one `/`), never straight from the query string.
- **Authorization**: checks in the UI are for UX only; the API enforces access.
- **User content** (testimonials, bios): render as text. Never use `dangerouslySetInnerHTML` with unsanitized content.
- **Secrets**: never in `NEXT_PUBLIC_*` variables.

---

## Performance

- Follow the `vercel-react-best-practices` skill.
- No barrel files: they defeat tree-shaking and slow down dev builds.
- Routes are code-split automatically. Use `next/dynamic` for heavy client-only widgets that aren't needed for the first paint.
- Keep `"use client"` at the leaves so most of each page ships no JavaScript.
- Use `next/image` for images and `next/font` for fonts.

---

## Testing

Bulletproof favors integration and end-to-end tests over many unit tests, and testing behavior over implementation.

| Level       | Tool                                               | What                                             | Where                                 |
| ----------- | -------------------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Unit        | Vitest (`unit` project, Node)                      | Pure functions in `utils/` and `api/` helpers    | `__tests__/{name}.test.ts`            |
| Component   | Storybook + `@storybook/addon-vitest` (Chromium)   | Rendering, interactions (`play()`), a11y          | Colocated `{name}.stories.tsx`        |
| End-to-end  | Playwright (planned)                               | Critical flows: events → detail → tickets        | To be defined                         |

- Run: `pnpm --filter web test` (all projects) or `pnpm --filter web exec vitest run --project unit`.
- The `unit` project only matches `src/**/*.test.ts`. Component tests go through Storybook stories.
- Unit tests live in a `__tests__` folder inside the folder they cover (e.g. `src/utils/__tests__/share.test.ts`), and import the code with `@/`.
- Fixtures, mocks, and test helpers live in `src/testing/` (e.g. `src/testing/seat-map.fixture.ts`), never next to components or utilities.
- Every story renders inside nuqs's `NuqsTestingAdapter` (`.storybook/preview.tsx`). `parameters.nuqs.searchParams` seeds the URL and `parameters.nuqs.onUrlUpdate` receives each update, so a story can assert the params a control writes.
- The testing roadmap is on the [project board](https://github.com/users/emanoelvso/projects/3) (issues #38 and #39).

---

## Project Standards

- **TypeScript strict**.
- **Absolute imports** with `@/` across folders; relative imports only within the same folder.
- **kebab-case** for every file and folder (Bulletproof; enforced with `eslint-plugin-check-file`). Route folders under `src/app/` follow Next.js segment names (`[slug]`), and `__tests__` / `__generated__` are exempt. The component `SeatMap` lives in `seat-map.tsx`.
- **Named exports** everywhere, except where a default export is required: Next.js special files (`page.tsx`, `layout.tsx`, ...) and a story's `meta`. Enforced with `import/no-default-export`.
- **No barrel files**: import `@/features/tickets/components/seat-map`, not `@/features/tickets`.
- **Lint**: `pnpm --filter web lint` (Next.js, Storybook, naming, and boundary rules).

### Naming Convention Reference

| Type                | Pattern                          | Example                              |
| ------------------- | -------------------------------- | ------------------------------------ |
| Component           | `{name}.tsx` (PascalCase export) | `seat-map.tsx` → `SeatMap`           |
| Story               | `{name}.stories.tsx`             | `seat-map.stories.tsx`               |
| Unit test           | `__tests__/{name}.test.ts`       | `__tests__/ticket-listings.test.ts`  |
| Fixture             | `testing/{name}.fixture.ts`      | `testing/seat-map.fixture.ts`        |
| GraphQL operation   | `api/{operation}.ts`             | `api/find-event-tickets.ts`          |
| Server fetcher      | `api/get-{resource}.ts`          | `api/get-event-tickets.ts`           |
| Client data hook    | `api/use-{resource}.ts`          | `api/use-event-tickets.ts`           |
| Other hook          | `hooks/use-{name}.ts`            | `hooks/use-seat-selection.ts`        |
| Store               | `stores/{name}-store.ts`         | `stores/checkout-store.ts`           |
| Utility             | `{name}.ts`                      | `utils/share.ts`                     |
| URL params          | `utils/{name}-search-params.ts`  | `utils/tickets-search-params.ts`     |
| Route files         | Next.js conventions              | `page.tsx`, `layout.tsx`, `error.tsx` |

---

## Workflows

### Adding a Feature

1. Create `src/features/{name}/` with only the folders it needs. Boundary rules apply automatically.
2. Declare its GraphQL operations in `api/` (document file, plus `get-*` and/or `use-*`).
3. Build its components in `components/`, each with a story.
4. Compose it in a page under `src/app/`.
5. Run `pnpm --filter web lint` and the tests.

### Adding a Page

1. Create `src/app/{route}/page.tsx` (a Server Component).
2. Fetch the first-render data with the features' `get-*` fetchers.
3. Render features; handle a missing resource with `notFound()`.
4. Add `error.tsx` (and `not-found.tsx` if a resource can be missing). Add `loading.tsx` only on routes that never call `notFound()`.

### Promoting Code to Shared

1. Move the file to `src/components/`, `src/types/api.ts`, or `src/utils/`.
2. Remove any dependency on feature code; pass data through props or arguments.
3. Update imports in both features. Lint confirms nothing still crosses features.

---

## Anti-Patterns to Avoid

| Anti-pattern                                                  | Instead                                               |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| Importing from another feature                                | Compose in the page, or promote the code to shared    |
| Components, hooks, or data logic inside route folders         | Put them in a feature; the page composes it           |
| A whole page marked `"use client"`                            | Server page, client leaves                            |
| Fetching first-render data in `useEffect` / client `useQuery` | Server fetch with `revalidate`, passed as props       |
| Copying query results into `useState`                         | Read from the cache; derive on render                 |
| Filters kept only in `useState`                               | URL `searchParams`                                    |
| `index.ts` barrels                                            | Direct file imports                                   |
| Arbitrary Tailwind values (`text-[#999999]`)                  | Theme tokens in `globals.css`                         |
| `process.env` scattered in code                               | `src/config/env.ts`                                   |
