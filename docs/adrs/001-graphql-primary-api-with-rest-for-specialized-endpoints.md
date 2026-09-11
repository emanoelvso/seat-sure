# ADR-001: GraphQL as Primary API with REST for Specialized Endpoints

- **Date**: 2026-09-10
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, api, graphql, rest

## Context

Seat Sure is a ticketing platform where data is inherently graph-like — Events relate to Venues, Artists, Ticket Categories, Seats, and Orders. Pages like the home page need to compose data from multiple sources (featured events, artists, testimonials, FAQs) in a single network round-trip. A pure REST API would require multiple requests per page or overly large aggregation endpoints, causing over-fetching and under-fetching problems. The project is also a portfolio piece, so the API design choice signals architectural maturity to evaluators.

## Decision

We will use **GraphQL as the primary API** for all product queries and mutations (events, tickets, artists, search, reviews, orders). REST will be used only for endpoints where it is a technical requirement or a strong convention:

- `POST /webhooks/stripe` — Stripe sends webhooks to a URL; REST is non-negotiable here
- `POST /uploads` — multipart file uploads (artist/event images) are awkward in GraphQL
- `GET /health` — infrastructure convention

All public queries (home page, event detail, search) will require no authentication. Protected mutations (purchase, review) will require a JWT token in the `Authorization: Bearer` header, passed through the same GraphQL endpoint.

Client-side caching will use **Apollo Client InMemoryCache**, which normalizes entities by `__typename + id`. Server-side caching for public pages will use **Next.js `fetch` with `revalidate`** (ISR), allowing the home page data to be served from cache and revalidated periodically without hitting the GraphQL server on every request.

## Consequences

### Benefits

- Single GraphQL query per page eliminates over-fetching and multiple round-trips
- Apollo InMemoryCache prevents re-fetching data already loaded during client navigation
- Next.js ISR (`next: { revalidate: 60 }`) makes the home page scalable with zero GraphQL calls for cached responses
- Type-safe schema enables automatic TypeScript type generation via GraphQL Code Generator
- Demonstrates modern API design knowledge in a portfolio context

### Challenges

- HTTP-level caching (CDN, `Cache-Control` headers) does not work natively with GraphQL POST requests — requires persisted queries or a custom caching layer to enable CDN caching
- N+1 query problems must be solved with DataLoader on the server side
- File uploads require a separate REST endpoint rather than a unified API surface

### Trade-offs

- A pure REST API would be simpler to implement and cache at the HTTP level, but would require multiple requests per page and less flexible querying
- GraphQL adds schema maintenance overhead that REST does not, but this is justified by the complexity of the data relationships in a ticketing platform
- Mixing GraphQL and REST increases the number of API patterns developers must understand, but the REST surface is intentionally minimal and limited to cases where REST is genuinely required
