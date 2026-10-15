# Load tests

k6 scenarios that exercise the API on a local stack: a seat contention check and a flash-sale spike. They never touch anything but `localhost`, `127.0.0.1` or `host.docker.internal`; any other `BASE_URL` makes the run exit before it sends traffic.

## What you need

- Docker running (Postgres and the `grafana/k6` image)
- Node and pnpm, with `pnpm install` done

## Run it

All commands run from `apps/api`.

```bash
# 1. Start Postgres
pnpm docker:start:deps

# 2. Create a dedicated database and migrate it
docker exec seat-sure-db psql -U postgres -c 'CREATE DATABASE "seat-sure-load"'
set -a; . ./.env.test; set +a
for module in catalog ticketing user-profile identity billing notifications; do
  DATABASE_NAME=seat-sure-load pnpm $module:db:migrate
done

# 3. Build and start the API on port 3000 against that database.
#    NODE_ENV=test comes from .env.test: production refuses the "log" code sender.
pnpm build
set -a; . ./.env.test; set +a
PORT=3000 DATABASE_NAME=seat-sure-load \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seat-sure-load \
  node dist/main.js
```

In a second terminal, from `apps/api`:

```bash
# 200 buyers race for one seat: expect 1 winner and 199 SEATS_UNAVAILABLE
pnpm load:contention

# Flash-sale spike: 0 to 2,000 buyers in 10 s, held for 60 s
pnpm load:spike
```

Each run checks that the API answers, seeds a fresh event with 500 seats and the buyer accounts, runs k6, samples Postgres and the API process every second, and finishes with the oversell check. The exit code is non-zero when a k6 threshold fails or the oversell check finds a duplicate seat or a sold-versus-paid mismatch.

The full spike creates 2,000 accounts first, which takes a few minutes. Buyer sessions last 15 minutes, so start the run right after the setup.

### Options

| Variable                                          | Default                                                        | Meaning                                  |
| ------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `BASE_URL`                                        | `http://localhost:3000/graphql`                                | API under test (local hosts only)        |
| `LOAD_DATABASE_URL`                               | `postgresql://postgres:postgres@localhost:5432/seat-sure-load` | Database the API uses (local hosts only) |
| `VUS`                                             | `2000`                                                         | Spike buyers (and accounts created)      |
| `RAMP_SECONDS` / `HOLD_SECONDS`                   | `10` / `60`                                                    | Spike ramp and hold                      |
| `HOLD_P95_MS` / `PAY_P95_MS` / `DISCOVERY_P95_MS` | `800` / `1500` / `500`                                         | Spike p95 thresholds                     |

A small smoke run: `VUS=10 RAMP_SECONDS=3 HOLD_SECONDS=15 pnpm load:spike`.

## Read the results

Every run writes `results/<scenario>-<timestamp>/` (gitignored):

| File              | Content                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `summary.json`    | k6 summary: p50/p95/p99 per operation (`{op:hold}`, `{op:pay}`, `{op:discovery}`), request rate, error counters |
| `resources.jsonl` | One line per second: Postgres connections, waiting locks, API CPU percent and RSS in KB                         |
| `oversell.json`   | Duplicate tickets and holds, and the reconciliation of tickets with payments (see below)                        |
| `fixture.json`    | The seeded event and buyer sessions (do not share)                                                              |

Expected business errors (`SEATS_UNAVAILABLE`, `ORDER_EXPIRED`) are counted apart. 5xx, timeouts and connection errors count as unexpected, and the spike fails above 1%.

Run the oversell check again by hand with `node load/verify/oversell.mjs <eventId>`.

## What the oversell check proves

Orders, seats, payments and tickets relate like this:

- An order has one item per seat.
- A successful payment (`BillingPayment` with status `succeeded`) pays one order for all its seats. Failed attempts may come before it, and a refunded payment no longer counts.
- An order has at most one successful payment.
- A paid order holds one live ticket (`issued`, `used` or `transferred`) per seat, linked through `orderItemId`. An unpaid order holds none.

The check passes when no seat has two live tickets or two holds, and tickets reconcile with payments:

| Field                | Meaning                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `soldTickets`        | Live tickets of the event                                                                                                                |
| `successfulPayments` | Successful payments of the event's orders                                                                                                |
| `paidSeats`          | Seats paid for: each successful payment counts its order's seats, so an order paid twice counts twice                                    |
| `unbalancedOrders`   | Orders paid more than once, or whose live tickets differ from their paid seats (`orderId`, `successfulPayments`, `seats`, `liveTickets`) |

It fails when `soldTickets` differs from `paidSeats` or `unbalancedOrders` is not empty. The totals catch a live ticket with no order; the per-order list catches errors that cancel out in the totals.

The check has its own tests. They need the local `seat-sure-test` database (`pnpm test:db:reset` sets it up) and build their fixtures in a throwaway schema:

```bash
pnpm test:load
```
