# Demo runtime controls

Demo mode is off unless `DEMO_MODE=true`. Use `AUTH_CODE_SENDER=disabled` for the demo; production never permits the log sender. Every visitor receives an independent verified synthetic account and a nonpersistent 24-hour session. Ordinary signup, login, email-code and password-reset mutations reject with `DEMO_ONLY`.

Demo mutations share one request budget per client, counting each aliased top-level field before its resolver runs. Defaults are 60 mutation fields per 60,000 milliseconds, with at most 10,000 in-memory client buckets. `DEMO_MAX_REQUESTS`, `DEMO_WINDOW_MS` and `DEMO_MAX_BUCKETS` configure those positive integer bounds. At capacity, new clients receive 429 until a bucket expires; existing clients keep their remaining budget. Queries do not consume this mutation budget. Existing login and card-specific limits still apply.

`TRUST_PROXY` defaults to an empty list: forwarding headers do not identify the client. Configure only the deployment's known proxy IP addresses or CIDR ranges as a comma-separated Express proxy allowlist. Express resolves the nearest untrusted hop; the guard uses that resolved client IP. Do not trust arbitrary client headers or enable every proxy. Verify the actual provider routing before launch.

`CLIENT_ADDRESS_SECRET` (at least 32 characters) lets a trusted web server forward the visitor's address in the `X-Seat-Sure-Client-Ip` header together with `X-Seat-Sure-Client-Secret`. The guard uses that address only when the secret matches in constant time and the value is a valid IP address; otherwise it uses the connection address as before. Set the same secret on the web app, which sends the headers on uncached server-side calls only.

These limits are per process for the single-instance free demo. Distributed capacity belongs to issue #122.

## Simulator cards

Demo mode accepts only the following simulator numbers, with spaces optional. Use a future expiry such as `12/39`, any three-digit CVV such as `123`, and a synthetic cardholder name. Never enter real card details.

| Number | Result |
| --- | --- |
| `4242424242424242` | Successful charge and saved-card entry |
| `4000000000000002` | Declined charge and saved-card entry |
| `4000000000000341` | Saves successfully; charging its saved token declines |

The API rejects other numbers with `INVALID_CARD` before tokenization or charging. Outside demo mode the existing simulator behavior is preserved. Card numbers and CVVs are never persisted.
