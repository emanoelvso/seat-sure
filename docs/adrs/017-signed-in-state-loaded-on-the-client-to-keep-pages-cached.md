# ADR-017: Signed-in State Loaded on the Client to Keep Pages Cached

- **Date**: 2026-10-02
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: frontend, nextjs, caching, authentication
- **Links**:
  - [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md) (public pages use ISR)
  - [ADR-016: Sessions as JWT Access Tokens and Rotating Refresh Tokens in httpOnly Cookies](./016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)
  - Decision AD-017 in `.specs/STATE.md`; feature `.specs/features/auth-login-signup/`

## Context

Once someone signs in, the header shows their avatar instead of "Signup". The header is rendered inside every page, and public pages such as home are cached with ISR (`revalidate = 60`). In Next.js, reading cookies while rendering makes the route dynamic, so a server-rendered signed-in header would render home and the event pages on every request. Next 16's Cache Components (Partial Prerendering) can stream a personalized hole into a cached shell, but turning it on changes the caching model of the whole app and conflicts with the no-streaming rule for pages that can answer 404 (AD-008).

## Decision

The header's account area is a small client component, `HeaderAccount`. After mount it fetches `GET /api/auth/session`, a Route Handler that is never cached. The handler reads the session cookies, refreshes the access token when needed (ADR-016), calls `me`, and returns `{ user }` or `{ user: null }`. Until the answer arrives the slot is empty, so a signed-in visitor never sees "Signup" flash. Shared layout and pages never read session cookies to render.

## Consequences

### Benefits

- Home and the other public pages keep ISR and their cached HTML.
- One place, the Route Handler, refreshes tokens and clears dead cookies on every page load.
- No change to the app's caching model.

### Challenges

- The account slot appears a moment after the page, on every navigation that remounts the header.
- One extra request per page load, plus an API call to `me`.

### Trade-offs

- Rendering the header on the server would avoid the extra request and the empty moment, but every page with a header would lose ISR.
- Cache Components would keep a cached shell with a server-rendered account slot, but it is an app-wide migration of its own. Revisit this ADR when the app adopts it, or when a page needs server-rendered personalized content beyond the header.
