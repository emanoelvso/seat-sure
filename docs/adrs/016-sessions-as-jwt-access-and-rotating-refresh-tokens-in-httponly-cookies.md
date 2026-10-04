# ADR-016: Sessions as JWT Access Tokens and Rotating Refresh Tokens in httpOnly Cookies

- **Date**: 2026-10-02
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: architecture, security, authentication, identity, backend, frontend
- **Links**:
  - [ADR-001: GraphQL as Primary API](./001-graphql-primary-api-with-rest-for-specialized-endpoints.md) (protected mutations take `Authorization: Bearer <JWT>`)
  - [ADR-002: PostgreSQL and Redis as Database Stack](./002-postgresql-and-redis-as-database-stack.md) (superseded in part: sessions and login rate limits live in PostgreSQL, not Redis)
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-017: Signed-in State Loaded on the Client to Keep Pages Cached](./017-signed-in-state-loaded-on-the-client-to-keep-pages-cached.md)
  - Decision AD-016 in `.specs/STATE.md`; feature `.specs/features/auth-login-signup/`

## Context

Login and signup add the first user identity to Seat Sure. ADR-001 says protected mutations take a JWT in a Bearer header. ADR-006 forbids one module from reading another module's tables, so Ticketing, Billing and Social Proof must be able to identify the caller without querying Identity. The spec also needs sessions that can be revoked (a password reset signs every device out), a "Remember me" choice (30 days, or until the browser closes and 24 hours at most), and tokens that browser JavaScript can never read. The web app renders on the server (Next.js), and the API is a separate origin.

## Decision

- **Access token**: a JWT (HS256, `JWT_SECRET` from config, required at boot) with `{ sub: userId, sid: sessionId }`, valid 15 minutes and never past its session's expiry. The shared `AuthGuard` verifies it without a database call and puts `userId` and `sessionId` in CLS. Any module can protect a resolver with it.
- **Refresh token**: 32 random bytes, stored only as a SHA-256 hash in `IdentitySession` with `persistent`, `expiresAt` (sign-in + 30 days, or + 24 hours) and `revokedAt`. Every refresh replaces it. The replaced token still works for 30 seconds and then returns a new access token but no new refresh token, so tabs that refresh at the same moment don't sign the user out.
- **Revocation**: Identity checks the session row on `refreshSession` and on `me`. A password reset revokes every session of the account.
- **The API is cookie-free**: it accepts `Authorization: Bearer` and returns tokens in mutation results. Only the Next.js server (Server Functions and Route Handlers) stores them, in `httpOnly`, `SameSite=Lax`, `Secure` (production) cookies `ss_access` and `ss_refresh`. Persistent sessions get `expires`; others are browser-session cookies.
- **Storage**: sessions, verification codes, reset grants and the login lockout counter are PostgreSQL tables in the Identity module, not Redis.

## Consequences

### Benefits

- Other modules authenticate requests without a call into Identity or a read of its tables, as ADR-006 requires.
- Revocation is one row update, and the header reflects it at once because `me` checks the row.
- Tokens never reach browser JavaScript, so an XSS bug can't steal a session.
- ADR-001's Bearer contract holds for every client, including future mobile or server-to-server callers.

### Challenges

- The web app must refresh before calling the API once the access token expires. Server Components can't write cookies, so refreshing happens in Route Handlers and Server Functions only.
- Expiry checks compare against app time passed into queries, never SQL `now()`, because the database clock can drift from the API host.
- `JWT_SECRET` rotation signs everyone out. There is no key ID or secondary key yet.

### Trade-offs

- A revoked session's access token still passes other modules' `AuthGuard` for up to 15 minutes. An opaque session token checked on every request would revoke instantly, but every protected call in every module would then call Identity synchronously.
- PostgreSQL instead of Redis (ADR-002) costs a write per refresh and per failed login. In return, sessions share Identity's transactions and its backup, with no second store to keep consistent, and Redis isn't running in any environment yet.
- Rotating refresh tokens adds the 30-second grace logic. A fixed refresh token would be simpler, but a stolen one would stay valid until the session ends.
