# Deploying the free portfolio demo

Status: **deployed** at <https://seat-sure-gamma.vercel.app> (web) with the API on Render and the database on Neon. Complete the [launch checklist](#launch-checklist) before making the repository public.

The demo runs on free tiers:

| Part | Service | Config |
| --- | --- | --- |
| Web | Vercel Hobby | project settings below |
| API | Render Free web service (Docker), Virginia | [`render.yaml`](../render.yaml); the region is set there and cannot be changed after the service is created |
| Database | Neon Free PostgreSQL, Washington, D.C. (same US East location as the API) | one dedicated database named `seat-sure-demo` |
| Daily reset | GitHub Actions | [`demo-reset.yml`](../.github/workflows/demo-reset.yml) |

Free-tier limits change. Re-read each provider's current plan page before launch: [Render free services](https://render.com/docs/free), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon plans](https://neon.com/docs/introduction/plans).

## Variables

Names only. Never commit values.

| Variable | Set on | Value |
| --- | --- | --- |
| `DATABASE_URL` | Render | Neon connection string for the `seat-sure-demo` database with `?sslmode=require` (or `verify-full`) |
| `DEMO_DATABASE_NAME` | Render (preset in `render.yaml`) | `seat-sure-demo`, exactly the database in `DATABASE_URL` |
| `CORS_ORIGIN` | Render | The exact Vercel origin, `https://...`, no trailing slash |
| `CLIENT_ADDRESS_SECRET` | Render and Vercel | The same random value (32+ characters, for example `openssl rand -hex 32`) on both. Without it the demo rate limit is shared by all visitors |
| `TRUST_PROXY` | Render | Leave unset (decided): forwarding headers are ignored. See [HTTPS, CORS and proxy](#https-cors-and-proxy) |
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
2. **Render.** Create a Blueprint from this repository and `render.yaml`. Enter `DATABASE_URL`, `CORS_ORIGIN` and `CLIENT_ADDRESS_SECRET` when prompted. Render deploys on its own once CI passes on `main`, and only when a change touches the API image (`apps/api`, `packages/shared`, the root package and lock files, or `render.yaml`; docs and tests are ignored), as set by `autoDeployTrigger` and `buildFilter` in `render.yaml`. Synced Blueprints replace the dashboard's build filter, so edit it in `render.yaml`. The start command (`node demo/start.mjs`) applies the migrations of all six contexts, seeds the sample event and only then starts the server, and it stops at the first failure. Because `CORS_ORIGIN` needs the Vercel origin, do step 3 first or edit the variable afterwards.
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

Render and Vercel terminate HTTPS. `CORS_ORIGIN` must be the exact web origin; a mismatch shows up as failed GraphQL requests in the browser. `TRUST_PROXY` is left unset (decided). If you ever set it, use only Render's confirmed proxy addresses from its documentation: with it empty, the API ignores forwarding headers and rate limits every visitor as the proxy's address, so the per-client demo budget is shared. Demo sign-in and checkout mutations are sent by the Next.js server actions, so the API's socket address is the web server's. The web server therefore forwards the visitor's address (from `x-real-ip` / `x-forwarded-for`, which Vercel sets) in a header, together with `CLIENT_ADDRESS_SECRET`; the API uses that address only when the secret matches, so per-visitor budgets work without trusting any proxy address on that hop. If `CLIENT_ADDRESS_SECRET` is missing on either side, all visitors share one budget. With the wrong addresses, clients can spoof their identity.

Database traffic uses verified TLS (`sslmode=verify-full`). Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0` anywhere.

## Reset and rollback

- **Reset by hand.** Run the "Demo reset" workflow manually, or locally with the confirmation variables: `DEMO_MODE=true DEMO_DATABASE_NAME=seat-sure-demo DATABASE_URL=... pnpm --filter api demo:reset`. It runs in one transaction, so an interruption leaves the previous data intact. It exits non-zero without touching data when demo mode, the database name or the target does not match.
- **Roll back a bad deploy.** In Render, redeploy a previous successful deploy. Migrations run forward only; a migration that must be undone needs a new migration.
- **Turn the demo off.** Suspend the Render service. To stop only the reset, set `DEMO_RESET_ENABLED` to anything other than `true`.

## Launch checklist

The release stays **blocked** until every box is checked. Items are verified by the maintainer, not assumed.

- [x] **Asset licenses.** The Evenjo design is CC BY 4.0 and the photos come from Freepik with attribution; credits are in the README and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md). Before launch, confirm each Freepik image's author credit is complete.
- [x] **Sample data.** The hosted catalog is the events the migrations load plus the original sample event. Both `demo:start` (through the seed) and the daily reset move events that are past, or less than a week away, forward by whole years, so the catalog looks the same on day one and after every reset. The migration events use real artist names as sample data; the README says so.
- [x] **Secret-scan findings.** Every finding is classified. The historical test JWT secret was confirmed test-only by the maintainer and, like the copied framework badge, is ignored by exact fingerprint in `.gitleaksignore`; nothing is allowlisted by path or rule. Six Figma component keys sit in a local-only commit that is not on any remote ref. Re-run the scan before publishing and do not claim more than it shows.
- [x] **History and identity.** The existing history and author email are kept (maintainer decision).
- [ ] **Repository and GitHub settings.** Description, topics and website set; visibility changed only after this checklist. Old issues and board items still carry local paths and internal labels; cleaning them was deliberately skipped (low risk, previews and a script exist if you change your mind).
- [ ] **CI on main.** The CI workflow passes on `main` on GitHub. The badge in the README must show this, not a local run.
- [ ] **Hosted verification.** Health check, cold-start behaviour, CORS, TLS, an anonymous purchase and a first reset all verified on the real URLs. Add the live URL to the README only after this.
- [ ] **Logged-out review.** The repository, issues, pull requests and README are viewed while logged out of GitHub, looking for local paths, tooling references and private information.
- [ ] **Close #120** only after the items above.
