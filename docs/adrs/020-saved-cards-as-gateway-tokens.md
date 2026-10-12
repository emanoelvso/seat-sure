# ADR-020: Saved Cards as Gateway Tokens

- **Date**: 2026-10-07
- **Status**: Accepted
- **Deciders**: emanoelvso
- **Tags**: api, billing, payments, security, backend
- **Links**:
  - [ADR-006: Modular Monolith with State Isolation per Bounded Context](./006-modular-monolith-with-state-isolation-per-bounded-context.md)
  - [ADR-012: Money as Integer Minor Units with Currency](./012-money-as-integer-minor-units-with-currency.md)
  - [ADR-018: Business Errors as Unprocessable Entity with a Reason Code](./018-business-errors-as-unprocessable-entity-with-a-reason-code.md)
  - [ADR-021: Card Operations Throttled per User in Billing](./021-card-operations-throttled-per-user-in-billing.md)

## Context

Checkout charged a typed card and forgot it. Users now save cards on `/account/payment` and pay with them at checkout. A saved card has to be chargeable later, but the product must never hold card secrets: the number and CVV stay out of the database, logs, errors, and responses. Billing owns payments (ADR-006), so Billing owns the saved cards. Only a simulated gateway exists today, so the design has to hold for a real provider.

## Decision

- **Billing stores a gateway token, not a card.** `BillingPaymentCard` holds the provider token plus display data (brand, last 4, expiry month and year, holder). The `PaymentGateway` port gains `tokenize`, `detach`, and a charge `source` that is either a typed card or a token.
- **Duplicates are found by an HMAC fingerprint.** `HMAC(number, billing.fingerprintSecret)` is stored as 64 hex characters, unique per `(userId, fingerprint)`. The secret comes from `BILLING_FINGERPRINT_SECRET` (required, 32+ characters). The same number gives the same fingerprint for one user, and the fingerprint reveals no digits.
- **Token and fingerprint never leave Billing.** The GraphQL `PaymentCard` type has no token or fingerprint field. Neither appears in a log call or an error message.
- **One default, five cards.** A partial unique index allows a single default per user. An advisory lock serialises add, set-default, and remove, so the 5-card limit and the default hold under concurrent requests. Removing the default promotes the oldest remaining card.
- **Removal is a hard delete.** The row goes, then the token is detached at the gateway after the commit. A detach failure is logged (card id only) and does not fail the removal. Past payments keep their own `cardBrand` and `cardLast4`.
- **Paying with a saved card goes through `payOrder`.** It takes exactly one of `card` or `savedCardId`, plus an opt-in `saveCard`. A card is saved only after the tickets are issued, and a save failure is logged with the order id and never fails the payment. A foreign or removed card id returns `CARD_NOT_FOUND` and leaves the order payable.
- **Expired saved cards fail without calling the gateway.** The payment is recorded as failed with reason `card_expired`, and the client sees `CARD_DECLINED`.

## Consequences

### Benefits

- A database leak exposes no card number or CVV, and the token alone is useless without the gateway account.
- A real provider fits the same port: its customer or payment-method id replaces the simulated token.
- Duplicate detection needs no card data.
- Ticketing never sees saved-card data; it passes a card id through `BillingApi`.

### Challenges

- Rotating `BILLING_FINGERPRINT_SECRET` changes every fingerprint, so duplicate checks stop matching older rows until they are re-keyed.
- Detach after commit can leave an orphan token at the gateway if the process dies in between. The simulated gateway hides this; a real one needs a reconciliation job.
- The simulated gateway decides outcomes from test card numbers (`4000 0000 0000 0002` declines at tokenize, `4000 0000 0000 0341` saves but its token charge declines). Those rules are fixtures, not product behaviour.

### Trade-offs

- Storing an encrypted card number would allow charging without a gateway token, but it puts card secrets in our database and in PCI scope.
- A plain hash of the number is guessable for a 16-digit space; the keyed HMAC costs one extra secret to manage.
- Soft-deleting removed cards would keep an audit trail, but the unique `(userId, fingerprint)` would then block re-adding a removed card, and a token that should be gone would stay on a row.
- Saving the card before the charge would be simpler, but a declined or failed payment would leave a card the user never confirmed.
