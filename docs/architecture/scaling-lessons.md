# Scaling Lessons from a Ticketing Talk

## Source

- Video: <https://www.youtube.com/watch?v=0TMr8rsmU-k> (Fabio Akita, "Como fazer o Ingresso.com escalar? | Conceitos Intermediários de Web").
- Every lesson below comes from the English subtitle transcript of that video, and the `HH:MM:SS` range points into that transcript. Lessons are paraphrased.
- Caveat: the speaker uses invented numbers for illustration (around 00:45:12). No figure in the talk is a measurement, and this document makes no claim about Seat Sure's own load or about any hosted environment.
- Each mapping was checked by reading the named ADR or module. Where a mapping could not be confirmed, the row says `no current mapping`.

## Lessons

| # | Lesson | Source | Seat Sure mapping |
| - | ------ | ------ | ----------------- |
| 1 | Seat inventory lives in a system shared with the box office. A seat is held temporarily (the talk says about 2 minutes) until payment confirms, then reserved permanently. Seat Sure holds for 10 minutes. | 00:03:54-00:05:04 | ADR-015; `ticketing` module (seat hold) |
| 2 | Move static assets to a CDN so they do not hit the app server. | 00:17:52-00:19:08 | no current mapping |
| 3 | Cache pages that are the same for everyone with a TTL (for example 5 minutes). Caching removes database and render time without changing the language or framework. Seat Sure caches public web pages with ISR. | 00:21:07-00:24:01 | ADR-017 |
| 4 | Add database indexes for the common read queries before anything else. | 00:20:26-00:21:04 | no current mapping |
| 5 | Model the order as a state machine, and never tie payment confirmation to one synchronous call to the payment provider. | 00:24:29-00:26:03 | `ticketing` module (order status enum); `billing` module (payment status enum) |
| 6 | Run slow or external work as queued jobs on workers (queue in Redis), not as in-process async calls that die with the web server. ADR-006 names BullMQ jobs for this, but no queue code exists yet. | 00:26:41-00:31:54 | no current mapping |
| 7 | "Shared nothing": web servers must be disposable, with no local files or RAM state and shared stores instead. Seat Sure keeps sessions in PostgreSQL and verifies access tokens without a database call. | 00:30:25-00:33:21 | ADR-016 |
| 8 | Protect the slow seat-selection step with a waiting room: a unique queue token per session, a cached waiting page, tokens capped at the seat count, and a worker that admits users in batches. The holds are covered by ADR-015; the waiting room itself does not exist in Seat Sure. | 00:34:19-00:39:28 | ADR-015; `ticketing` module (seat hold) |
| 9 | When tokens run out, tell users early and suggest other theaters or dates. | 00:39:33-00:39:57 | no current mapping |
| 10 | Put DoS, WAF, and bot protection in front to limit scalpers. | 00:41:01-00:41:19 | no current mapping |
| 11 | Default to SQL, and choose NoSQL only with a strong, measured justification. | 00:42:17-00:42:25 | ADR-002 |
| 12 | Run heavy reports on a read replica or as a background job, with the result cached. | 00:43:00-00:44:03 | no current mapping |
| 13 | Measure before optimizing: install metrics and profiling, then fix the top few offenders first. | 00:45:24-00:46:26 | no current mapping |
| 14 | Have a minimal test suite before changing the architecture, so a speed-up is not a skipped code path. | 00:46:54-00:47:46 | ADR-010 |
| 15 | Do not build all of this on day one. Add the pieces one at a time as the product grows. | 00:44:30-00:44:47 | ADR-006 |

## Related

- [C4 documentation](./c4/README.md) shows the system as built. Redis is `planned` there, which is why lesson 6 has no mapping.
- ADRs: [002](../adrs/002-postgresql-and-redis-as-database-stack.md), [006](../adrs/006-modular-monolith-with-state-isolation-per-bounded-context.md), [010](../adrs/010-testing-strategy-real-database-e2e-and-storybook-browser-tests.md), [015](../adrs/015-seat-holds-owned-by-ticketing.md), [016](../adrs/016-sessions-as-jwt-access-and-rotating-refresh-tokens-in-httponly-cookies.md), [017](../adrs/017-signed-in-state-loaded-on-the-client-to-keep-pages-cached.md).
