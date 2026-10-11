# Flash-sale hardening

## Before (baseline, unmodified API)

### Setup

| Item | Value |
| ---- | ----- |
| Date | 2026-10-11, spike started 17:57:28 UTC |
| Machine | Apple M1 Pro, 8 cores, 16 GB RAM, macOS 26.6.2 |
| Docker | Engine 28.4.0, VM with 8 CPUs and 8.2 GB RAM |
| API commit | `9c5e75dd3adf2912b7d015d3a525a45f7144c7a8` (no change under `apps/api/src` since `2dfceaa`, the commit of the first run) |
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

A first run on the same API code (`apps/api/load/results/spike-2026-10-11T17-45-55-996Z/`, commit `2dfceaa`) had the same outcome: all four thresholds failed (hold p95 9,427 ms, pay p95 20,699 ms, discovery p95 7,485 ms, 7.11% unexpected), oversell passed, API CPU 84 to 115%. Its summary had no p99 or per-operation error rates, so the harness was fixed (`9c5e75d`) and the spike repeated. The numbers above are the baseline.
