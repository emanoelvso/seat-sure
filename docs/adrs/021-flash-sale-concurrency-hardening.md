# ADR-021: Flash-Sale Concurrency Hardening with an Admission Limiter

- **Date**: 2026-10-12
- **Status**: Accepted. The spike thresholds were NOT all met on a single node; see Consequences.
- **Deciders**: emanoelvso
- **Tags**: api, ticketing, performance, load-testing, backend
- **Links**:
  - [ADR-015: Seat Holds Owned by Ticketing](./015-seat-holds-owned-by-ticketing.md)
  - [Flash-sale hardening write-up](../flash-sale-hardening.md)
  - Feature `.specs/features/k6-load-tests/`

## Context

A k6 spike of 2,000 buyers against one 500-seat event on the unmodified API missed all four thresholds (hold p95 8,372 ms, pay p95 20,601 ms, discovery p95 7,806 ms, 2.31% unexpected). The cause was one Node process saturating one core, so every request queued behind the event loop, while Postgres stayed idle (connections peaked at 45 of 100, `waitingLocks` 0 in all 92 samples). Oversell never happened. Evidence: `apps/api/load/results/spike-2026-10-11T17-57-28-521Z/` and the Before section of the write-up. The three candidate levers were the seat claim strategy of ADR-015, database pool tuning, and queueing or admission control.

## Decision

Add an admission limiter and apply it to `startCheckout` and `payOrder` only.

- `AdmissionLimiter` (`9f123f9`) counts the work in flight. At the limit it rejects at once with `AdmissionBusyException`, a 422 business error with reason `BUSY` that the client may retry. The slot is released after success and after a throw.
- The ticketing resolver wraps the two mutations in the limiter (`1a59927`).
- The limit comes from `ADMISSION_MAX_CONCURRENT` and defaults to 100. The default was chosen, not derived from measurements.
- The spike harness counts `BUSY` apart from errors as `busy_responses{op}` (`9c20bfb`).

Hardened runs at limits 100, 20, 50 and 10 (`spike-2026-10-11T18-11-08-278Z`, `18-21-36-614Z`, `18-25-01-887Z`, `18-28-07-676Z`) show that a limit of 20 or 10 brings hold p95 to 110 and 85 ms and pay p95 to 125 and 151 ms, while 50 and 100 fail hold p95 (1,411 and 3,053 ms). The default of 100 therefore fails the hold threshold on this machine; operators should lower it through the environment. Changing the default is a separate decision.

## Consequences

### Benefits

- Checkout latency stays bounded under a flash sale: shed requests answer in 13 to 18 ms at the median instead of queueing for seconds.
- Seat claims are unaffected, so oversell stays impossible: the check passed in all runs, and 200 simultaneous buyers for one seat give one winner.
- The limit is tunable per deployment without a code change.

### Challanges

- Thresholds were not met. Discovery p95 stayed at 3.7 to 9.4 s and unexpected errors at 1.16 to 1.62% in every run, all of them discovery responses. The process is still CPU-bound near 100% of one core, and discovery, which is outside the limiter, is now most of the requests.
- The limiter is per process. A deployment with several API processes admits the limit on each of them.
- The default of 100 is not tuned; the right value depends on the machine.

### Trade-offs

- Shedding sells fewer seats under load: 43 of 500 seats paid in the 71 s run at limit 20, against 188 at limit 100. `BUSY` rates were 85.5% to 98.1% of holds. Predictable latency is bought with refused requests.
- Shed buyers browse again, so total request rate rose from 315 to 700 to 970 requests per second, mostly discovery. The limiter moves load rather than removing it.
- Contention with 200 simultaneous buyers and limit 100 returns 1 winner, 123 `SEATS_UNAVAILABLE` and 76 `BUSY` (`contention-2026-10-11T18-31-09-824Z`); the scenario expects 199 `SEATS_UNAVAILABLE` and passes only with a limit of 200 (`contention-2026-10-11T18-31-44-731Z`).

### Alternatives rejected

- Claim strategy change (batching or ordering seat claims): not needed. `waitingLocks` was 0 in every sample of every run, hold had 0 unexpected errors, and oversell and contention checks passed. Nothing waited on a row lock.
- Pool tuning (explicit `max` and timeouts on the six datasources): not applied. Connections peaked at 37 to 45 of 100, and the process was CPU-bound near 100% with shed requests answering in 13 to 18 ms, so a larger pool cannot lower latency. There are no per-pool wait metrics, so a pool limit is not ruled out; the risk is recorded in the write-up.
- Admission on discovery: out of scope for this work. It would also need the spike scenario to accept `BUSY` on discovery.
