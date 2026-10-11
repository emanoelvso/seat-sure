# C4 Level 3: API Components

The bounded contexts inside the API container. There is one component per directory in `apps/api/src/module`, plus the shared kernel. Component ids are the directory names.

```mermaid
C4Component
  title Component Diagram: Seat Sure API

  Container_Boundary(api, "API (NestJS modular monolith)") {
    Component(ticketing, "Ticketing", "NestJS module", "Orders, seat holds, tickets")
    Component(billing, "Billing", "NestJS module", "Payments and saved cards")
    Component(catalog, "Catalog", "NestJS module", "Events, artists, venues, seat maps")
    Component(identity, "Identity", "NestJS module", "Registration, sessions, password reset")
    Component(notifications, "Notifications", "NestJS module", "In-app notifications")
    Component(user-profile, "User Profile", "NestJS module", "Profile and preferences")
    Component(shared, "Shared kernel", "NestJS modules", "Auth, config, GraphQL, HTTP client, integration interfaces, logger, persistence")
  }

  Rel(ticketing, billing, "Imports module")
  Rel(ticketing, catalog, "Imports module")
  Rel(ticketing, identity, "Imports module")
  Rel(ticketing, notifications, "Imports module")
  Rel(identity, notifications, "Imports module")
  Rel(identity, user-profile, "Imports module")
```

## Sources

- Relationships come from the `imports` array of each `*.module.ts` in `apps/api/src/module`:
  - `ticketing.module.ts` imports `CatalogModule`, `BillingModule`, `IdentityModule`, `NotificationsModule`.
  - `identity.module.ts` imports `UserProfileModule` and `NotificationsModule`.
  - `billing.module.ts`, `catalog.module.ts`, `notifications.module.ts`, and `user-profile.module.ts` import no other bounded-context module.
- Billing, identity, notifications, ticketing, and user-profile import `AuthModule` from the shared kernel; billing, identity, and ticketing also import `LoggerModule`. Those arrows are left out to keep the diagram readable.
- Modules reference each other's data by plain ids, never by joins: [ADR-006](../../adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md). Catalog owns ticket types and seat maps: [ADR-011](../../adrs/011-catalog-owns-ticket-types-and-seat-maps.md). Ticketing owns seat holds: [ADR-015](../../adrs/015-seat-holds-owned-by-ticketing.md).
- Social Proof is a bounded context in [bounded-contexts.md](../bounded-contexts.md) with no module yet, so it is not shown.
- Previous level: [container diagram](./container.md).
