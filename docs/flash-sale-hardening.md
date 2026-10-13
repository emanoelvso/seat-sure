# Flash-sale hardening

## Before (baseline, unmodified API)

### Setup

| Item | Value |
| ---- | ----- |
| Date | 2026-10-11, spike started 17:57:28 UTC |
| Machine | Apple M1 Pro, 8 cores, 16 GB RAM, macOS 26.6.2 |
| Docker | Engine 28.4.0, VM with 8 CPUs and 8.2 GB RAM |
| API commit | `2d2bbae851ec8e210e04a994453eb2ea84341bb9` (no change under `apps/api/src` since `ee95735`, the commit of the first run) |
| Note | The runs were made on this change set based on commit `299cf1c`. The hashes in this document are the same commits replayed on top of `main`; the code under `apps/api/src` is identical |
| k6 | v2.3.0 (grafana/k6 image, linux/arm64) |
| API | `node dist/main.js`, one process, port 3000, `.env.test` (NODE_ENV=test); API, k6 container and Postgres share the host |
| Database | Dedicated `seat-sure-load` database on the `seat-sure-db` container (`max_connections=100`), dropped, recreated and migrated for all six modules before the run |
| Scenario | `pnpm load:spike`: 2,000 VUs, 10 s ramp, 60 s hold; one event with 500 seats, 2,000 accounts |
| Run duration | k6 1m25s; results in `apps/api/load/results/spike-2026-10-11T17-57-28-521Z/` |

### Results per operation

| Operation | Requests | Requests/s | p50 | p95 | p99 | Unexpected-error rate |
| --------- | -------- | ---------- | --- | --- | --- | --------------------- |
| browse/discovery | 13,304 | 156.3 | 1,885 ms | 7,806 ms | 8,717 ms | 4.62% (615) |
| hold | 13,034 | 153.2 | 7,137 ms | 8,372 ms | 9,092 ms | 0% (0) |
| pay | 505 | 5.9 | 12,792 ms | 20,601 ms | 21,435 ms | 0.99% (5) |
| all | 26,843 | 315.5 | 6,068 ms (waiting) | 8,331 ms (waiting) | 10,975 ms (waiting) | 2.31% (620) |

500 orders were paid; 12,529 hold attempts ended in the expected `SEATS_UNAVAILABLE` (counted apart, not errors). Source: `summary.json` (`http_req_duration{op:*}`, `http_reqs{op:*}`, `unexpected_errors{op:*}`).

### Thresholds

| Threshold | Measured | Result |
| --------- | -------- | ------ |
| hold p95 < 800 ms | 8,372 ms | FAIL |
| pay p95 < 1,500 ms | 20,601 ms | FAIL |
| discovery p95 < 500 ms | 7,806 ms | FAIL |
| unexpected errors < 1% | 2.31% | FAIL |

k6 exited with code 99 (thresholds crossed).

### Oversell check

Passed (`oversell.json`): no duplicate tickets, no duplicate holds, 500 sold tickets and 500 paid seats for a 500-seat event.

### What broke first

The single Node API process saturated one CPU core. Every operation queued behind it, so latency ran 10x to 100x over the thresholds while almost no request failed (hold had zero unexpected errors).

- CPU, `resources.jsonl`: from 17:58:46 until the load ended at 18:00:09, `apiCpuPercent` averaged 107% over 83 samples (range 30 to 178%). With 8 cores available that is one busy event loop. The 410% sample at 17:58:40 is the first sample after sampler start and is not load.
- Memory, `resources.jsonl`: `apiRssKb` grew from 165 MB to a peak of 822 MB.
- Latency shape, `summary.json`: hold median 7.1 s, pay median 12.8 s, slowest request 24.7 s. These are queue waits, not slow queries.
- Not Postgres: connections peaked at 45 of 100 and `waitingLocks` was 0 in all 92 samples (1 s interval), so no lock waits were seen.
- API log: `/tmp/k6run/api2.log` is empty; the API logged no errors.
- Pool waits cannot be ruled out. The TypeORM datasource factories set no `poolSize` or `extra` (for example `apps/api/src/module/ticketing/persistence/typeorm-datasource.factory.ts:5-20`), so TypeORM passes `max: undefined` (`apps/api/node_modules/typeorm/driver/postgres/PostgresDriver.js:1380`) and `pg-pool` falls back to `max = 10` (`pg-pool/index.js:89`). With `connectionTimeoutMillis` unset, a request waits for a free connection with no time limit (`pg-pool/index.js:206`). There are six datasources (one per module), so the ceiling is 10 connections each, 60 in total. The observed 45 total is below that, but the sampler counts the whole database, not each pool, so one module pool (ticketing or billing, on the hold and pay path) could have been full at 10. Unbounded pool waits would also explain slow requests without errors. Separating pool waits from event-loop saturation needs per-pool metrics, which this run does not have.
- Errors that did occur: 615 discovery failures (4.6%) and 5 pay failures. Discovery durations have `min=0` and `http_req_connecting` max is 5.9 s (p99 2.0 s), so these look like connection-level failures during the ramp, when 2,000 VUs connect at once. The exact error text is not exported.

Authentication: the sessions were created minutes before the spike, inside the 15-minute JWT lifetime; no token expiry was seen.

### Prior run

A first run on the same API code (`apps/api/load/results/spike-2026-10-11T17-45-55-996Z/`, commit `ee95735`) had the same outcome: all four thresholds failed (hold p95 9,427 ms, pay p95 20,699 ms, discovery p95 7,485 ms, 7.11% unexpected), oversell passed, API CPU 84 to 115%. Its summary had no p99 or per-operation error rates, so the harness was fixed (`2d2bbae`) and the spike repeated. The numbers above are the baseline.

## Fix levers

Chosen from the baseline evidence above, one decision per lever. These decisions are final for the hardening work; the hardened run revisits one only if its own evidence says so.

| Lever | Decision | Evidence |
| ----- | -------- | -------- |
| Locking and claim strategy | Not needed | `waitingLocks` was 0 in all 92 samples; hold had 0 unexpected errors; the oversell check passed; the contention scenario yields exactly 1 winner. Nothing waited on a row lock, so reordering or batching seat claims has nothing to fix. |
| Pool tuning | Not implicated by the evidence (inconclusive) | Postgres connections peaked at 45 of 100 and the run has no pool-wait metrics. The process was CPU-bound (`apiCpuPercent` averaged 107%, queueing medians of 7 to 13 s), which explains the latency without a pool limit. |
| Queueing and admission control | Apply | One Node process saturated about one core and requests queued behind it (hold p50 7.1 s, pay p50 12.8 s) while Postgres stayed idle. Bounding the concurrent `startCheckout` and `payOrder` work and answering the excess with a retryable `BUSY` business error (HTTP 422) sheds load instead of letting every request wait. |

Known risk, not changed: the datasource factories leave the pool unset (`pg` default `max = 10`, no acquire timeout; see `apps/api/src/module/ticketing/persistence/typeorm-datasource.factory.ts`). Pool tuning is revisited after the hardened run only if that run shows pool waits.

Consequences: pool tuning and a claim strategy change are skipped; the admission limiter applies.

## After (hardened API)

The admission limiter (`067ed5a`, applied to checkout in `e69852d`) is the only lever applied. The spike harness counts `BUSY` apart from errors since `c01a83c`. The hardened API did not meet the spec thresholds in any run: hold and pay pass at low limits, discovery p95 and the unexpected-error rate always fail.

### Setup

| Item | Value |
| ---- | ----- |
| Date | 2026-10-11, runs between 18:11 and 18:32 UTC |
| Machine | Apple M1 Pro, 8 cores, 16 GB RAM, macOS 26.6.2; Docker VM with 8 CPUs and 8.2 GB RAM |
| API commit | `c01a83cef68ee61bd9cf052dac2eec33701783fa` (`git rev-parse HEAD`, `dist` rebuilt from it before every run) |
| k6 | v2.3.0 (grafana/k6 image, linux/arm64) |
| Database | `seat-sure-load` dropped, recreated and migrated for all six modules before every spike |
| Scenario | Same as the baseline: 2,000 VUs, 10 s ramp, 60 s hold, 500 seats |
| Admission limit | `ADMISSION_MAX_CONCURRENT` set in the API environment per run (the default of 100 applies when it is unset); no code change between runs |

### Results per run

Each cell is p50 / p95 / p99 in ms. Requests per second, unexpected-error rate and busy rate are per operation. Busy rate is `busy_responses{op}` divided by `http_reqs{op}`. Source: `summary.json` of each directory under `apps/api/load/results/`.

Run A, limit 100 (default), `spike-2026-10-11T18-11-08-278Z`:

| Operation | Requests/s | p50 / p95 / p99 | Unexpected-error rate | Busy rate |
| --------- | ---------- | --------------- | --------------------- | --------- |
| discovery | 447.3 | 817 / 9,350 / 11,188 | 2.54% (879) | n/a |
| hold | 248.4 | 18 / 3,053 / 5,083 | 0% | 85.5% (16,463) |
| pay | 6.4 | 22 / 2,921 / 3,179 | 0% | 61.8% (304) |
| all | 702.1 | | 1.62% (879) | |

Run B, limit 20, `spike-2026-10-11T18-21-36-614Z`:

| Operation | Requests/s | p50 / p95 / p99 | Unexpected-error rate | Busy rate |
| --------- | ---------- | --------------- | --------------------- | --------- |
| discovery | 637.6 | 486 / 3,803 / 4,244 | 2.46% (1,199) | n/a |
| hold | 325.8 | 14 / 110 / 2,246 | 0% | 96.5% (23,977) |
| pay | 4.1 | 16 / 125 / 2,016 | 0% | 86.2% (269) |
| all | 967.5 | | 1.62% (1,199) | |

Run C, limit 50, `spike-2026-10-11T18-25-01-887Z`:

| Operation | Requests/s | p50 / p95 / p99 | Unexpected-error rate | Busy rate |
| --------- | ---------- | --------------- | --------------------- | --------- |
| discovery | 494.0 | 1,492 / 6,334 / 8,810 | 1.79% (680) | n/a |
| hold | 262.2 | 17 / 1,411 / 3,671 | 0% | 91.1% (18,351) |
| pay | 5.9 | 17 / 1,182 / 1,389 | 0% | 65.2% (294) |
| all | 762.1 | | 1.16% (680) | |

Run D, limit 10, `spike-2026-10-11T18-28-07-676Z`:

| Operation | Requests/s | p50 / p95 / p99 | Unexpected-error rate | Busy rate |
| --------- | ---------- | --------------- | --------------------- | --------- |
| discovery | 637.5 | 479 / 3,740 / 3,995 | 1.80% (869) | n/a |
| hold | 321.8 | 14 / 85 / 2,031 | 0% | 98.1% (23,952) |
| pay | 2.9 | 13 / 151 / 393 | 0% | 83.8% (186) |
| all | 962.2 | | 1.19% (869) | |

Baseline for comparison (unmodified API, no limiter): hold p95 8,372 ms, pay p95 20,601 ms, discovery p95 7,806 ms, 2.31% unexpected.

### Thresholds

| Threshold | A (100) | B (20) | C (50) | D (10) |
| --------- | ------- | ------ | ------ | ------ |
| hold p95 < 800 ms | 3,053 FAIL | 110 pass | 1,411 FAIL | 85 pass |
| pay p95 < 1,500 ms | 2,921 FAIL | 125 pass | 1,182 pass | 151 pass |
| discovery p95 < 500 ms | 9,350 FAIL | 3,803 FAIL | 6,334 FAIL | 3,740 FAIL |
| unexpected errors < 1% | 1.62% FAIL | 1.62% FAIL | 1.16% FAIL | 1.19% FAIL |

k6 exited with code 99 in all four runs.

### Oversell and contention

- Oversell check: passed in all four runs (`oversell.json`): no duplicate tickets or holds; sold tickets equal paid seats (188, 43, 157 and 36 orders paid respectively, out of 500 seats).
- Contention (200 VUs, one seat), default limit 100, `contention-2026-10-11T18-31-09-824Z`: exactly 1 winner and no 5xx, but only 123 `SEATS_UNAVAILABLE` and 76 `BUSY`. k6 exited 99 because the scenario expects 199 `SEATS_UNAVAILABLE` and counts `BUSY` as unexpected. With 200 buyers arriving at once and a limit of 100, shedding is the designed behaviour; the scenario was not changed.
- Contention with `ADMISSION_MAX_CONCURRENT=200` (limit above the 200 callers), `contention-2026-10-11T18-31-44-731Z`: 1 winner, 199 `SEATS_UNAVAILABLE`, 0 unexpected, k6 exit 0, oversell ok.

### Fix-run loop

Run A is the hardened API as shipped (limit 100). Its failure and the three env-only changes that followed:

| Loop | Change | Result |
| ---- | ------ | ------ |
| 1 | `ADMISSION_MAX_CONCURRENT=20` | Hold p95 8,372 -> 110 ms and pay p95 -> 125 ms pass. Discovery p95 3,803 ms and 1.62% unexpected still fail. |
| 2 | `ADMISSION_MAX_CONCURRENT=50` | Hold p95 1,411 ms fails again; discovery 6,334 ms. Worse than 20, so the limit was not raised. |
| 3 | `ADMISSION_MAX_CONCURRENT=10` | Hold and pay pass; discovery p95 3,740 ms and 1.19% unexpected still fail. No gain over 20, and fewer orders paid (36 against 43). |

The loop stopped after three iterations with discovery and the unexpected-error rate still failing.

### Cause of the remaining failures

- The Node process is still CPU-bound. In every run `apiCpuPercent` averaged 100 to 104% over the 71 to 72 loaded seconds of `resources.jsonl` (one saturated core of eight); the sampler shows no idle gap.
- Discovery (`findEventTickets`, `findUnavailableSeats`) is not behind the limiter and is now the bulk of the work: 34,646 to 48,648 requests against 222 to 492 pay requests. Requests per second rose from 315 in the baseline to 702 to 967 because shed buyers (`BUSY` hold) give up the iteration and browse again after 1 to 2 s, so the limiter converts expensive checkout work into more discovery calls.
- All unexpected errors are discovery responses (`unexpected_errors{op:discovery}` = 680 to 1,199; hold and pay show 0). As in the baseline they look like connection-level failures during the 2,000-VU ramp: `http_req_connecting` max 5.9 s in run B. `http_req_failed` equals the discovery count. The error text is not exported.
- Postgres is not the limit: connections peaked at 37 to 42 of 100 and `waitingLocks` was 0 in every sample of every run (`resources.jsonl`), so the claim lever stays unnecessary.
- Busy responses were high: 85.5% of holds at limit 100 and 96.5% at limit 20. Hold p95 passes only when the limit is low enough that few holds do real work, which also means few orders are paid (43 of 500 seats in 71 s at limit 20).
- Pool tuning was not applied: the process is CPU-bound at about 100% and the shed holds and pays answer in 13 to 18 ms at the median, so a larger pool cannot lower discovery latency. Per-pool wait metrics still do not exist, so the pool risk from the Before section is unchanged.
- The levers in scope (claim, pool, admission on checkout) do not reduce discovery cost. Meeting the discovery and error thresholds needs something outside them: more than one API process, cheaper or cached discovery queries, or admission applied to discovery with the scenario accepting `BUSY` there. That choice is left to the decision on this evidence.

## Result: thresholds not met on a single node

The hardened API on one Node process does not meet the spec thresholds at 2,000 VUs. Hold and pay pass at a low admission limit; discovery p95 and the unexpected-error rate fail at every limit tried. Oversell never occurred.

| Run | Limit | Hold p95 | Pay p95 | Discovery p95 | Unexpected | Hold busy | Orders paid | Results directory |
| --- | ----- | -------- | ------- | ------------- | ---------- | --------- | ----------- | ----------------- |
| Before | none | 8,372 ms | 20,601 ms | 7,806 ms | 2.31% | n/a | 500 | `spike-2026-10-11T17-57-28-521Z` |
| A | 100 (default) | 3,053 ms | 2,921 ms | 9,350 ms | 1.62% | 85.5% | 188 | `spike-2026-10-11T18-11-08-278Z` |
| B | 20 | 110 ms | 125 ms | 3,803 ms | 1.62% | 96.5% | 43 | `spike-2026-10-11T18-21-36-614Z` |
| C | 50 | 1,411 ms | 1,182 ms | 6,334 ms | 1.16% | 91.1% | 157 | `spike-2026-10-11T18-25-01-887Z` |
| D | 10 | 85 ms | 151 ms | 3,740 ms | 1.19% | 98.1% | 36 | `spike-2026-10-11T18-28-07-676Z` |

All figures come from `summary.json`, `oversell.json` and `resources.jsonl` in those directories under `apps/api/load/results/`. Runs A to D use API commit `c01a83c`; the Before run used `2d2bbae`.

Contention, 200 VUs on one seat:

| Limit | Winners | `SEATS_UNAVAILABLE` | `BUSY` | k6 exit | Results directory |
| ----- | ------- | ------------------- | ------ | ------- | ----------------- |
| 100 (default) | 1 | 123 | 76 | 99 | `contention-2026-10-11T18-31-09-824Z` |
| 200 | 1 | 199 | 0 | 0 | `contention-2026-10-11T18-31-44-731Z` |

With the default, the scenario's expectation of 199 `SEATS_UNAVAILABLE` and 0 unexpected cannot hold, because 76 callers are shed by design. The scenario was not changed.

The hold and pay passes come at a cost: at limit 20, 96.5% of holds were shed and 43 of 500 seats were paid in the run, against 188 at limit 100. Total requests per second rose from 315 (Before) to 702 to 967 because shed buyers browse again.

## Lever outcomes

| Lever | Outcome | Evidence and commit |
| ----- | ------- | ------------------- |
| Locking and claim strategy | Unnecessary, not changed | `waitingLocks` was 0 in every sample of the baseline and runs A to D; hold had 0 unexpected errors; oversell passed in all runs; contention gives 1 winner. |
| Pool tuning | Not applied, not ruled out | Connections peaked at 37 to 45 of 100 (`resources.jsonl`); the process was CPU-bound near 100% in every run and shed requests answered in 13 to 18 ms at the median. Per-pool wait metrics do not exist. |
| Queueing and admission control | Applied to `startCheckout` and `payOrder` | Limiter `067ed5a`, applied in `e69852d`, `BUSY` counted apart in the spike by `c01a83c`. Hold and pay p95 pass at limits 20 and 10 (runs B, D). Limit 100 (the default) and 50 fail hold p95. The default was chosen, not derived; see [ADR-022](./adrs/022-flash-sale-concurrency-hardening.md). |

The fix-run loop (three env-only changes of `ADMISSION_MAX_CONCURRENT`: 20, 50, 10) is in the After section. No code changed during it.

## Unexplained: discovery connection-level failures

Every unexpected error in runs A to D is a discovery response (680 to 1,199 per run; hold and pay show 0, `unexpected_errors{op:*}` in `summary.json`). The baseline had 615. They look like connection failures while 2,000 VUs connect at once (`http_req_connecting` max 5.9 s in run B), but the scenario exports the count, not the error text, so the cause is not confirmed. Capturing the status or error code per failed request is the first step before changing anything here.

## Remaining limits and what a larger deployment needs

Not done; options only:

- Several API processes behind a load balancer, since one Node process is capped at about one core (`apiCpuPercent` near 100% in all runs). The limiter is per process, so the limit would apply to each.
- Cheaper or cached discovery (`findEventTickets`, `findUnavailableSeats`), which is now 35k to 49k of 55k to 74k requests per run.
- Admission on discovery, which would require the spike scenario to accept `BUSY` there.
- Per-pool wait metrics, and pool tuning (`max`, `connectionTimeoutMillis`) if those metrics show waits.
- A limit chosen per machine; the default of 100 fails hold p95 here.
- A shared limiter if a global limit across processes is wanted.
- Load generation from a separate machine: here the API, k6 container and Postgres share one host.
