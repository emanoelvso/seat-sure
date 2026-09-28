# Architecture Guidelines

How the Seat Sure frontend is organized. Based on [Bulletproof React](https://github.com/alan2207/bulletproof-react), adapted to the Next.js 16 App Router and the stack in [ADR-004](../../../docs/adrs/004-frontend-technology-stack.md) (React 19, Tailwind v4, CVA, Radix UI, Storybook) and the data strategy in [ADR-001](../../../docs/adrs/001-graphql-primary-api-with-rest-for-specialized-endpoints.md) (GraphQL, Apollo Client, ISR).

- All paths are relative to `apps/web/`.
- Code marked **(existing code)** is real; everything else shows the target shape.
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
    │   ├── provider.tsx    # Global client providers (Apollo), used by the root layout
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
    ├── types/              # Shared types (api.ts: entities used by several features)
    └── utils/              # Shared pure functions (price, dates, share)
```

`src/graphql/`, `src/providers/`, and `src/lib/utils/` predate this structure. Their migration is tracked in `todo.md`; don't add new files there.

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

Add features as new product areas appear (checkout, auth, account). Features are organized by UI area; they usually line up with a backend bounded context but don't have to.

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
| `types/`             | `api.ts` for entities shared across features                                   |
| `utils/`             | Pure, framework-free functions (`price.ts`, `share.ts`)                         |
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
| `{operation}.ts`         | `gql` document + variable/result types | Both                           |
| `get-{resource}.ts`      | Server fetcher                        | Server Components only         |
| `use-{resource}.ts`      | Apollo hook                           | Client Components only         |

This split adapts Bulletproof's one-file-per-request pattern to Server Components: the document file is safe in both environments, while fetchers and hooks each stay on their side of the boundary. Create only the consumers you need.

```ts
// src/features/tickets/api/find-event-tickets.ts
import { gql } from "@apollo/client";

export const FIND_EVENT_TICKETS = gql`
  query FindEventTickets($input: FindEventTicketsInput!) {
    findEventTickets(FindEventTicketsInput: $input) {
      event { id name coverImage venue city country startAt endsAt }
      ticketTypes { id sectionKey name priceCents currency seatsAvailable maxPerOrder tags }
    }
  }
`;

// FindEventTickets and its nested types are declared here too
export interface FindEventTicketsData {
  findEventTickets: FindEventTickets;
}
```

```ts
// src/features/tickets/api/get-event-tickets.ts
import { graphqlServerFetch } from "@/lib/graphql-server";
import { FIND_EVENT_TICKETS, FindEventTicketsData } from "./find-event-tickets";

export async function getEventTickets(eventId: string) {
  const data = await graphqlServerFetch<FindEventTicketsData>(
    FIND_EVENT_TICKETS,
    { input: { eventId } },
    { revalidate: 60, tags: [`event:${eventId}`] },
  );
  return data.findEventTickets;
}
```

```ts
// src/features/tickets/api/use-event-tickets.ts
import { useQuery } from "@apollo/client/react";
import { FIND_EVENT_TICKETS, FindEventTicketsData } from "./find-event-tickets";

export function useEventTickets(eventId: string) {
  return useQuery<FindEventTicketsData>(FIND_EVENT_TICKETS, {
    variables: { input: { eventId } },
  });
}
```

### Server Fetcher

`src/lib/graphql-server.ts` doesn't exist yet (tracked in `todo.md`). Target shape:

```ts
// src/lib/graphql-server.ts
import { print, type DocumentNode } from "graphql";
import { env } from "@/config/env";

interface CacheOptions {
  revalidate?: number | false;
  tags?: string[];
}

export async function graphqlServerFetch<TData>(
  document: DocumentNode,
  variables: Record<string, unknown>,
  { revalidate = 60, tags }: CacheOptions = {},
): Promise<TData> {
  const response = await fetch(`${env.apiUrl}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: print(document), variables }),
    next: { revalidate, tags },
  });

  const { data, errors } = await response.json();
  if (errors?.length) throw new Error(errors[0].message);
  return data as TData;
}
```

The project uses Next.js 16's previous caching model (`cacheComponents` is off), where `fetch` is uncached unless `cache` or `next.revalidate` is set. Next's docs don't say whether the Data Cache applies to POST requests. Confirm it when implementing the fetcher. If it doesn't, wrap the call in `unstable_cache` (see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`).

### Types

- GraphQL types are hand-written until GraphQL Code Generator (ADR-001) is adopted.
- Operation-specific types live in the operation file; entities used by several features live in `src/types/api.ts`.

---

## Server & Client Components

- ✅ **Server Components by default.** Pages and non-interactive sections render on the server.
- ✅ **`"use client"` at the leaves.** Mark the filter bar or the seat map as a client component, not the whole page.
- ✅ **First render from the server.** Public pages (home, events, event detail, artist) fetch on the server with `revalidate` (ADR-001 ISR) and pass data down as props. Client components take over for interaction: filtering, pagination, seat selection.
- ✅ **Serializable props.** Props passed from Server to Client Components must be plain data: no functions or class instances; dates as ISO strings.
- ❌ Never import a `get-*` server fetcher into a Client Component, or a `use-*` hook into a Server Component.
- ❌ Never read `process.env` outside `src/config/env.ts`. Only `NEXT_PUBLIC_*` variables reach the browser.

---

## State Management

Bulletproof splits state into five categories. Pick the category first, then the tool:

| Category          | Examples                                   | Seat Sure                                                                                   |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Component state   | Open/closed dropdown, hovered seat         | `useState` / `useReducer`                                                                   |
| Application state | Signed-in user, global modals              | React Context, only when prop drilling hurts. No global store library until one is needed. |
| Server cache      | Events, artists, ticket types              | Next.js fetch cache (server), Apollo `InMemoryCache` (client)                               |
| Form state        | Checkout, login                            | Bulletproof recommends React Hook Form + Zod. Not installed; decide with the first real form. |
| URL state         | Filters, sort order, pagination, selected tab | `searchParams` + `useSearchParams` / `router.replace`                                     |

- ✅ Keep state as close as possible to where it's used.
- ✅ Derive values instead of syncing them: compute filtered listings from data and filters on render, don't store them.
- ✅ Put filters and pagination in the URL so results are shareable and survive a refresh.
- ❌ Don't copy query results into `useState` or context; read them from the cache.

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
// Condensed from src/components/Button.tsx (existing code)
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
- **Feature level**: Client Components handle Apollo's `error` with a fallback inside the feature, so one failing section doesn't blank the page.
- **Server fetches**: `graphqlServerFetch` throws on GraphQL errors, which renders the nearest `error.tsx`.
- **Future**: error tracking (e.g. Sentry) in production.

---

## Security

- **Authentication** (when login is built): the API expects `Authorization: Bearer <JWT>` (ADR-001). Bulletproof recommends keeping tokens out of `localStorage`, in HttpOnly cookies. Decide how the token reaches the API (e.g. through a Next.js route handler) in an ADR when login lands.
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
- Unit tests live in a `__tests__` folder inside the folder they cover (e.g. `src/utils/__tests__/price.test.ts`), and import the code with `@/`.
- Fixtures, mocks, and test helpers live in `src/testing/` (e.g. `src/testing/seat-map.fixture.ts`), never next to components or utilities.
- The testing roadmap is in `todo.md` under "Frontend Testing".

---

## Project Standards

- **TypeScript strict**.
- **Absolute imports** with `@/` across folders; relative imports only within the same folder.
- **kebab-case** for every file and folder (Bulletproof; enforced with `eslint-plugin-check-file` once the migration is done). The component `SeatMap` lives in `seat-map.tsx`.
- **Named exports** everywhere, except where a default export is required: Next.js special files (`page.tsx`, `layout.tsx`, ...) and a story's `meta`.
- **No barrel files**: import `@/features/tickets/components/seat-map`, not `@/features/tickets`.
- **Lint**: `pnpm --filter web lint` (Next.js, Storybook, and boundary rules).

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
| Utility             | `{name}.ts`                      | `utils/price.ts`                     |
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
4. Add `error.tsx` (and `loading.tsx` if the page streams).

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
