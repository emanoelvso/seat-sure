# ADR-024: Charges Authorized, Then Captured After Issue, with 3-D Secure

- **Date**: 2026-10-19
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, web, billing, ticketing, payments, security
- **Links**:
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-018: Business Errors as Unprocessable Entity with a Reason Code](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)
  - [ADR-020: Saved Cards as Gateway Tokens](./020-saved-cards-as-gateway-tokens.md)
  - [ADR-021: Card Operations Throttled per User in Billing](./021-card-operations-throttled-per-user-in-billing.md)

## Context

Checkout charged the card in one step, then issued the tickets. If the seats were lost between the charge and the issue, the buyer paid for nothing and a refund had to follow. A real card network also lets the bank ask for 3-D Secure, a challenge the buyer completes in the browser while the seat holds keep running. Only a simulated gateway existed, so the design has to cover a real provider (Stripe, test mode only) without moving card secrets through our servers.

## Decision

- **Every charge is authorize, issue, capture.** `PaymentGateway.authorize` places a hold with manual capture. Ticketing claims the order, authorizes through `BillingApi`, issues the tickets in one transaction, and only then calls `BillingApi.capture`. A lost seat or an expired order calls `cancel` on the authorization. It is never refunded, and no hold is extended.
- **Ticketing orchestrates, Billing owns the payment.** Ticketing calls Billing only through `BillingApi` (ADR-006); Billing never calls Ticketing. Billing owns the payment row, the gateway, the idempotency keys and the throttle (ADR-021).
- **3-D Secure pauses the order.** An authorization that needs a challenge returns `requires_action` with a client secret, and the order moves to `REQUIRES_ACTION`. The buyer completes the challenge in a modal on the checkout page, then `confirmOrderPayment` reads the payment's real state and settles the order. There are no webhooks: a paused order settles on `confirmOrderPayment` or on a checkout reload (which offers "Continue"). A failed challenge returns `AUTHENTICATION_FAILED` and the order stays payable.
- **Every gateway call carries the idempotency key `<billingPaymentId>:<operation>`** for authorize, capture, cancel and refund. A retry never moves money twice. A capture that fails is retried three times, then logged.
- **A card to save is tokenized before the charge** and held as a pending card until the capture, so a payment that needs 3-D Secure still saves the card, and only once it is paid (ADR-020 keeps its rule: no card is saved for a payment that did not complete).
- **`BILLING_GATEWAY` picks the gateway.** `simulated` (default) keeps its state in a Billing table, so it survives restarts and the demo can run it. `stripe` requires a test-mode secret key (`sk_test_` or `rk_test_`); a live key stops the API at boot.
- **The simulated gateway has a 3-D Secure fixture.** The card `4000 0027 6000 3184` pauses the charge; a "Test bank" dialog with Approve and Fail finishes it through `POST /billing/simulated-3ds/:clientSecret`, which answers 404 when the gateway is `stripe`.
- **With Stripe, card data never reaches our servers.** The browser tokenizes the card with Stripe Elements and sends only the `pm_...` PaymentMethod id (`payOrder` takes `paymentMethodId`; `/account/payment` uses `addPaymentMethod`). Stripe.js loads only with a `pk_test_` publishable key; any other key shows "Payments are unavailable right now." and no key keeps the typed card form. The browser runs the challenge with `stripe.handleNextAction`.
- **Tests never call Stripe.** The suites use the simulated gateway or a stubbed Stripe client, and stories inject a fake Stripe. `pnpm --filter api test:stripe-sandbox` is an opt-in smoke test against Stripe's test mode; it skips without a test key and is not part of `test`, `test:e2e` or CI.

## Consequences

### Benefits

- A buyer is never charged for tickets they do not get, and nobody has to refund a lost seat.
- A 3-D Secure pause can outlive the seat holds without a refund: the authorization is cancelled.
- The same flow runs against the simulated gateway and Stripe, so the demo and the real provider behave alike.
- Card numbers and CVVs stay in Stripe's iframes; our servers see an opaque id.

### Challenges

- A crash between authorize and cancel or capture can leave a hold at Stripe for up to seven days until it lapses. A reconciliation job is a follow-up.
- Without webhooks, a buyer who closes the tab mid-challenge is settled only when they come back or when the order expires.
- Capture happens after the tickets exist, so a capture that keeps failing leaves tickets issued with an uncaptured hold. It is logged for follow-up, not retried forever.

### Trade-offs

- Charging at once and refunding on a lost seat is simpler, but it charges buyers for tickets they cannot have and depends on refunds working.
- Webhooks would settle abandoned challenges on their own, but they need a public endpoint and signature handling that this project does not run yet.
- Redirect-based 3-D Secure would be less code than a modal, but it would leave the checkout page and lose the countdown and the order state.
