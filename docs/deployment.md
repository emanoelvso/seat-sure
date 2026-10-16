# Deploying the free portfolio demo

Status: **prepared, not deployed.** Nothing here has been provisioned or verified on a hosted service, no URL exists, and the daily reset is switched off. Complete the [launch checklist](#launch-checklist) before making the repository or the demo public.

The demo runs on free tiers:

| Part | Service | Config |
| --- | --- | --- |
| Web | Vercel Hobby | project settings below |
| API | Render Free web service (Docker) | [`render.yaml`](../render.yaml) |
| Database | Neon Free PostgreSQL | one dedicated database named `seat-sure-demo` |
| Daily reset | GitHub Actions | [`demo-reset.yml`](../.github/workflows/demo-reset.yml) |

Free-tier limits change. Re-read each provider's current plan page before launch: [Render free services](https://render.com/docs/free), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon plans](https://neon.com/docs/introduction/plans).

## Variables

Names only. Never commit values.

| Variable | Set on | Value |
| --- | --- | --- |
| `DATABASE_URL` | Render | Neon connection string for the `seat-sure-demo` database with `?sslmode=verify-full` |
| `DEMO_DATABASE_NAME` | Render (preset in `render.yaml`) | `seat-sure-demo`, exactly the database in `DATABASE_URL` |
| `CORS_ORIGIN` | Render | The exact Vercel origin, `https://...`, no trailing slash |
| `TRUST_PROXY` | Render | Render's proxy addresses, or empty. See [HTTPS and proxy](#https-cors-and-proxy) |
| `JWT_SECRET`, `BILLING_FINGERPRINT_SECRET` | Render (generated) | Render generates them on first sync; keep them out of the repository |
| `NODE_ENV`, `DEMO_MODE`, `AUTH_CODE_SENDER`, `REDIS_HOST`, `REDIS_PORT` | Render (preset) | `production`, `true`, `disabled`, and two unused placeholders |
| `NEXT_PUBLIC_API_URL` | Vercel | The Render service origin, `https://...`, no trailing slash |
| `DEMO_MODE` | Vercel | `true` |
| `NEXT_PUBLIC_TIME_ZONE` | Vercel (optional) | An IANA zone; default `UTC` |
| `DEMO_DATABASE_URL` | GitHub Actions **secret** | Same Neon URL as `DATABASE_URL`, for the reset job |
| `DEMO_DATABASE_NAME` | GitHub Actions **variable** | `seat-sure-demo` |
| `DEMO_RESET_ENABLED` | GitHub Actions **variable** | `true` only when the reset should run |

The API refuses to start in production with a weak or placeholder secret, with the `log` code sender, or without demo mode when email delivery is disabled. See [API configuration](../apps/api/README.md#configuration).

## Deploy order

1. **Neon.** Create a project and a database named `seat-sure-demo` (the demo scripts require the word `demo` in the name and refuse `test`, `prod` or `production`). Copy the connection string with TLS verification (`sslmode=verify-full`).
2. **Render.** Create a Blueprint from this repository and `render.yaml`. Enter `DATABASE_URL`, `CORS_ORIGIN` and `TRUST_PROXY` when prompted. Auto deploy is off; trigger deploys by hand. The start command (`node demo/start.mjs`) applies the migrations of all six contexts, seeds the sample event and only then starts the server, and it stops at the first failure. Because `CORS_ORIGIN` needs the Vercel origin, do step 3 first or edit the variable afterwards.
3. **Vercel.** Import the repository with `apps/web` as the root directory, Node 22, and these commands (the web app imports the shared package, so build it first):
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm --filter @seat-sure/shared build && pnpm --filter web build`

   Set the Vercel variables above. Keep "include source files outside of the root directory" enabled so the workspace is available. `NEXT_PUBLIC_API_URL` is inlined at build time, so redeploy after changing it.
4. **Reset job.** Add the secret and variables for GitHub Actions, then set `DEMO_RESET_ENABLED=true` when you want the daily 06:17 UTC reset. Run the workflow once by hand (`workflow_dispatch`) first and read its log.

## Verify

```bash
curl -i https://<api-origin>/health        # 200 and {"status":"ok"}
```

Then, in a private browser window: open the web origin, choose **Sign in as demo**, pick seats, and complete a purchase with the simulator card from the [demo runtime notes](../apps/api/docs/demo-runtime.md#simulator-cards). Check the browser console for CORS errors and confirm the card form shows the "Demo only" notice.

## Behaviour to expect

- **Cold starts.** A free Render service sleeps after 15 minutes without traffic and takes about a minute to wake. The first demo action can fail or stall; the sign-in action shows a retryable error and sets no cookie. Waking the API with a `/health` request before sharing the link avoids it.
- **No disk.** Render Free has no persistent disk. Every state lives in Neon.
- **Quotas.** Free tiers cap build minutes, bandwidth, database storage and compute hours. A traffic spike or a long-lived deployment can exhaust them; the demo then stops until the quota resets.
- **Single process.** Demo rate limits and the admission limit are per process. Capacity beyond one instance is out of scope here; see [#122](https://github.com/emanoelvso/seat-sure/issues/122).
- **Resets remove data.** The daily reset deletes visitor accounts, sessions, orders, cards and notifications, keeps the sample catalog, rebuilds the original sample event and moves past event dates forward by whole years. A visitor in the middle of a purchase loses it. The UI says demo data is reset periodically.

### HTTPS, CORS and proxy

Render and Vercel terminate HTTPS. `CORS_ORIGIN` must be the exact web origin; a mismatch shows up as failed GraphQL requests in the browser. Leave `TRUST_PROXY` empty unless you have confirmed Render's proxy addresses from its documentation: with it empty, the API ignores forwarding headers and rate limits every visitor as the proxy's address, so the per-client demo budget is shared. Even with it set, demo sign-in and checkout mutations are sent by the Next.js server actions, and the web server does not forward the visitor's address, so on Vercel and Render all visitors share one budget per web-server egress address. Treat the demo rate limit as a global brake, not a per-visitor limit, until the web app forwards a trusted client address. With the wrong addresses, clients can spoof their identity. Decide this before launch.

Database traffic uses verified TLS (`sslmode=verify-full`). Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0` anywhere.

## Reset and rollback

- **Reset by hand.** Run the "Demo reset" workflow manually, or locally with the confirmation variables: `DEMO_MODE=true DEMO_DATABASE_NAME=seat-sure-demo DATABASE_URL=... pnpm --filter api demo:reset`. It runs in one transaction, so an interruption leaves the previous data intact. It exits non-zero without touching data when demo mode, the database name or the target does not match.
- **Roll back a bad deploy.** In Render, redeploy a previous successful deploy. Migrations run forward only; a migration that must be undone needs a new migration.
- **Turn the demo off.** Suspend the Render service. To stop only the reset, set `DEMO_RESET_ENABLED` to anything other than `true`.

## Launch checklist

The release stays **blocked** until every box is checked. Items are verified by the maintainer, not assumed.

- [x] **Asset licenses.** The Evenjo design is CC BY 4.0 and the photos come from Freepik with attribution; credits are in the README and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md). Before launch, confirm each Freepik image's author credit is complete.
- [x] **Sample data.** The hosted catalog is the events the migrations load plus the original sample event. Both `demo:start` (through the seed) and the daily reset move events that are past, or less than a week away, forward by whole years, so the catalog looks the same on day one and after every reset. The migration events use real artist names as sample data; the README says so.
- [ ] **Secret-scan findings.** Every finding from the full-history scan is classified. The historical test JWT secret in a committed test configuration file is still unresolved. No broad allowlist is added just to turn the scan green.
- [ ] **History and identity.** Decide whether to keep the existing commit history and author email, or use a GitHub noreply address for future commits.
- [ ] **Repository and GitHub settings.** Issue, pull-request, comment and project-board cleanup reviewed and applied (see the previews from the release script, once generated); description, topics and website set; visibility changed only after this checklist.
- [ ] **CI on main.** The CI workflow passes on `main` on GitHub. The badge in the README must show this, not a local run.
- [ ] **Hosted verification.** Health check, cold-start behaviour, CORS, TLS, an anonymous purchase and a first reset all verified on the real URLs. Add the live URL to the README only after this.
- [ ] **Logged-out review.** The repository, issues, pull requests and README are viewed while logged out of GitHub, looking for local paths, tooling references and private information.
- [ ] **Close #120** only after the items above.
