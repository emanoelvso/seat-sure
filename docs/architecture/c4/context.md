# C4 Level 1: System Context

Who uses Seat Sure and which external system it depends on. Elements tagged `planned` have no code or config in the repo yet.

```mermaid
C4Context
  title System Context: Seat Sure

  Person(buyer, "Ticket buyer", "Browses events, picks seats, pays, and manages the account")
  System(seatSure, "Seat Sure", "Ticketing platform: event catalog, seat selection and holds, checkout, orders")
  System_Ext(gateway, "Payment gateway (planned)", "Real card processor. Only a simulated gateway exists today", $tags="planned")

  Rel(buyer, seatSure, "Buys tickets")
  Rel(seatSure, gateway, "Tokenizes, charges, and detaches cards (planned)", $tags="planned")

  UpdateElementStyle(gateway, $bgColor="grey", $borderColor="grey")
  UpdateRelStyle(seatSure, gateway, $textColor="grey", $lineColor="grey")
```

## Sources

- The billing module defines the `PaymentGateway` port and wires `SimulatedPaymentGateway` (`apps/api/src/module/billing/billing.module.ts`). No real provider adapter exists, so the external gateway is `planned`.
- Saved cards are gateway tokens: [ADR-020](../../adrs/020-saved-cards-as-gateway-tokens.md).
- Next level: [container diagram](./container.md).
