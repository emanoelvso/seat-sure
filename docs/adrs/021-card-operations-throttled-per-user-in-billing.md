# ADR-021: Card Operations Throttled per User in Billing

- **Date**: 2026-10-11
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, billing, payments, security, backend
- **Links**:
  - [ADR-020: Saved Cards as Gateway Tokens](./020-saved-cards-as-gateway-tokens.md)
  - [ADR-016: Sessions as JWT Access Tokens and Rotating Refresh Tokens in httpOnly Cookies](./016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md)
  - [ADR-018: Business Errors as Unprocessable Entity with a Reason Code](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)

## Context

`addPaymentCard` and saved-card charges could be called without limit. A signed-in user, or a hijacked session, could run card testing: many cheap attempts to find a card that works. Identity already locks logins after repeated failures; Billing had nothing.

## Decision

- **One failure counter per user, shared by both operations.** `BillingCardThrottle` holds `failedCount`, `windowStartedAt`, and `lockedUntil`, unique per `userId`. The 5th failure inside 15 minutes locks `addPaymentCard` and saved-card charges together for 15 minutes.
- **Only failures count.** An add rejected as `INVALID_CARD` or `CARD_DECLINED`, and a saved-card charge that ends `failed` (including `card_expired`). `DUPLICATE_CARD`, `CARD_LIMIT_REACHED`, `card_not_found`, and unexpected gateway errors do not. A successful add or saved-card charge clears the counter.
- **The lock is checked before any rule or gateway call.** A blocked add fails with `CARD_ATTEMPTS_LIMITED` (422, [ADR-018](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)). A blocked saved-card charge returns `card_attempts_limited`, records no payment, and Ticketing releases the order claim and returns the same reason, so the order stays payable.
- **Same mechanics as the login lockout.** One atomic `INSERT ... ON CONFLICT DO UPDATE` against the caller's `now`, so concurrent failures are all counted. The failure write runs in its own transaction (`REQUIRES_NEW`) so the throwing request does not roll it back.
- **Out of the lock:** listing, setting the default, removing cards, and typed-card charges at checkout.

## Consequences

### Benefits

- Card testing is capped at 5 attempts per 15 minutes per user, at no cost to normal buyers.
- The counter lives in the Billing database, so it survives restarts and works across API instances.
- The pattern is the same as Identity's, so there is one mechanism to understand.

### Challenges

- The limit is per user. An attacker with many accounts is not slowed; IP or global limits would be needed.
- Typed-card charges at checkout are not throttled, because the product surface named only add and saved-card charges. A stolen card can still be tried there.
- Saving a card after a paid order goes through the same add path, so its declines count and a locked user's save is skipped (logged, the order stays paid).
- The limits (5, 15 minutes) are constants, not configuration.

### Trade-offs

- Counting every attempt would be simpler, but a heavy legitimate buyer could lock themselves out.
- An in-memory counter needs no table, but it resets on restart and breaks with more than one API instance.
- A Redis counter would expire by itself, but Billing would depend on a second store for a rule that fits one row.
