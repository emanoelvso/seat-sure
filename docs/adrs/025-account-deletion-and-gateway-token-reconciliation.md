# ADR-025: Account Deletion and Gateway Token Reconciliation

- **Date**: 2026-10-20
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, web, identity, billing, privacy, payments, backend
- **Links**:
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-018: Business Errors as Unprocessable Entity with a Reason Code](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)
  - [ADR-020: Saved Cards as Gateway Tokens](./020-saved-cards-as-gateway-tokens.md)
  - [ADR-024: Charges Authorized, Then Captured After Issue, with 3-D Secure](./024-charges-authorized-then-captured-with-3-d-secure.md)

## Context

A signed-in user could not delete their account, so personal data and saved cards stayed forever, and their Stripe payment methods stayed attached to a Stripe customer. Separately, Billing detaches a gateway token after its database commit (card removal, a refused pending card, a failed insert after attach). A crash or a gateway error in between leaves a payment method attached at Stripe with no row pointing to it, and nothing found those orphans (the open consequence of ADR-020).

Each module owns its own datasource (ADR-006), so a deletion cannot be one transaction. Identity cannot import Ticketing (Ticketing imports Identity). The free Render plan has no cron jobs and no paid service may be activated.

## Decision

- **Identity runs the deletion; every module with user data registers an eraser.** A provider marked `@AccountErasure()` (a Nest 11 `DiscoveryService.createDecorator`) implements `AccountEraser`: `erase(userId)` is idempotent and may throw, and an optional `findBlocker` can refuse the deletion. Identity finds the erasers at runtime, so no module import changes. Four exist: `billing`, `notifications`, `ticketing`, `user-profile`. A new module with user data adds a provider and nothing else. Identity deletes its own rows last.
- **The deletion order is fixed.** `deleteMyAccount(confirmation)` checks the typed phrase `DELETE` (trimmed, case-sensitive), asks each eraser for a blocker, then in one identity transaction records the deletion and revokes every session. Each eraser then runs in its own try/catch. With no failure, Identity deletes its own rows and marks the deletion complete. With a failure, the deletion stays pending. The mutation returns `true` either way, because the intent is recorded and the user is already signed out.
- **Deletion is refused while money or seats are in play.** An order in `pending`, `processing` or `requires_action` that has not expired, or an `issued` ticket for an event that starts later, fails with `ACCOUNT_HAS_ACTIVE_ORDERS` (ADR-018). No refund policy is needed.
- **`IdentityAccountDeletion` is the pending record and the token check.** It holds the user id and `completedAt`, and no personal data, so it is kept forever. `AuthGuard` reads it through an optional global `AccountStatusApi` and refuses the access token of a pending or completed deletion. Login for that email fails like a wrong password. The email stays taken until the identity row is gone.
- **Orders, order items, tickets and billing payments are kept.** They hold only the user id and event and amount data, which no longer resolves to a person once the identity and profile rows are gone.
- **Billing erases cards and the Stripe customer.** Under the per-user lock it deletes saved cards, pending cards and the card-throttle row. After the commit it detaches each token (a failure is logged with the user id, never the token), then deletes each Stripe customer, which detaches every payment method, and only then deletes that customer's row. If a customer delete fails, the row is kept and the erasure fails, so the deletion stays pending and the customer stays visible to reconciliation.
- **A CLI finishes deletions and reconciles tokens.** `pnpm --filter api maintenance` runs `dist/maintenance.main.js` once per call, with a `MaintenanceModule` that has no GraphQL. It finishes every pending deletion through `IdentityApi`, then reconciles tokens through `BillingApi`; one failing does not skip the other. It exits 1 when anything failed, otherwise 0. Any scheduler can run it; none is configured. Overlapping runs are safe because every step is idempotent.
- **Reconciliation is a stateless diff.** For every `stripe` customer in `BillingCustomer`, it lists the card payment methods attached at Stripe (following pagination) and detaches each one that has no saved-card or pending-card row and was created more than 24 hours before the run. It re-checks the row right before the detach. A failure for one customer is counted and the next customer runs. A customer missing at Stripe is counted and skipped. With the simulated gateway it makes no call and reports zero. One summary line is logged; no token, payment-method id or Stripe customer id is ever logged.
- **`detach` is idempotent without matching message text.** On an invalid-request error the adapter retrieves the method: `customer === null` or `resource_missing` means it is already detached. Anything else rethrows the original error.
- **Cleanup that follows a commit never hides the real outcome.** If the insert after an attach fails and the cleanup detach also fails, Billing rethrows the insert's error. Dropping a pending card deletes the row, and a detach failure is logged and not thrown. Reconciliation backs both up.
- **The web adds a "Delete account" section at the bottom of `/account/settings`.** A dialog asks the user to type `DELETE`; success clears the session cookies and lands on `/?accountDeleted=1`, where a client component in a `<Suspense>` shows the notice, so the ISR home page stays static.

## Consequences

### Benefits

- A deleted user's personal data, saved cards and Stripe customer are gone, and the email can sign up again.
- A partial failure never leaks data: the account is unusable at once and the next run finishes it.
- Orphan Stripe payment methods are found and detached by one command, and the second run detaches nothing.
- Adding a module with user data touches only that module.

### Challenges

- The check, the revocation and the erasure are not one transaction. An order opened in the same millisecond as the check expires on its own. A card add that passed `AuthGuard` just before the deletion can insert a row after the Billing erasure, leaving one card row and an attached method for a deleted user. The window is one request long and is accepted; the row stays visible to operators.
- Discovery and the optional `AccountStatusApi` fail open if a provider is not wired. AppModule tests assert that the discovered erasers are exactly `billing, notifications, ticketing, user-profile` and that a deleted user's old token is refused.
- `AuthGuard` now does one primary-key lookup on a tiny table for every authenticated request, a small cost on checkout under load. The k6 scripts are unchanged.
- Reconciliation makes one Stripe request per customer plus its pages, sequentially. That is fine for a test-mode portfolio and would need batching with many customers.
- Stripe does not document what listing the methods of a deleted customer returns. The adapter handles both `resource_missing` and an empty list. An opt-in sandbox test covers it and runs only with the owner's keys.
- With the simulated gateway active and leftover `stripe` customer rows, erasure deletes the rows and does not delete the Stripe customers.
- Seeded tickets can have no order item, so the event time is unknown. They count as upcoming (conservative); only tests create them.
- **Follow-ups, not done here.** The shared persistence module registers named datasources, so `app.close()` throws `UnknownElementException` on shutdown (`@nestjs/typeorm` looks up the default DataSource). The maintenance entry point destroys its datasources itself; fixing the module would let it use `app.close()`. The `maintenance:dev` script is `nest start --entryFile maintenance.main` rather than `tsx`, because esbuild emits no decorator metadata and Nest then reports undefined dependencies. Stripe authorizations that go stale stay out of scope (ADR-024).

### Trade-offs

- A single orchestrator that imports every module would be simpler to read but breaks module isolation and the Identity-Ticketing dependency direction.
- An event bus or queue would retry erasures on its own, but it needs Redis and a worker the free plan does not give. A stateless diff run by a CLI needs neither.
- A grace period or undo would protect against accidents, but the typed phrase and the refusal while orders are open already guard the common mistakes, and demo visitors have no password to confirm with.
- An outbox table of pending detaches would be exact, but the stateless diff finds the same orphans with no extra table and also covers detaches lost before any row was written.
- Deleting the customer row even when the Stripe delete fails would finish the erasure, but it would hide a surviving customer from reconciliation. The row stays until Stripe confirms.
