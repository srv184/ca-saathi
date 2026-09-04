# CA Saathi API Diagnostic Report

**Scope:** read-only diagnostic pass on 1 September 2026. No application code or configuration was changed.  
**Evidence tiers:** static source/configuration inspection; minimal production probes; deployment logs where accessible.

## Executive summary

- **Confirmed live:** `GET /api/health` returned **200 OK** from Vercel. Anonymous `GET /api/notices` and `GET /api/gst/reconcile` returned the expected **401**, so production routing and middleware are reachable.
- **Logs:** Vercel deployment/function logs for the last seven days could not be retrieved from this checkout. There is no `.vercel/project.json`, Vercel token, or authenticated Vercel CLI session. Therefore no route can be declared healthy on the basis of logs.
- **Primary break risk:** Prisma/Neon Postgres is a hard dependency of 24 of 26 API route files. The health route does not test it, so Vercel can be healthy while nearly all product APIs fail if the database was deleted or unavailable.
- **Confirmed design weakness:** `POST /api/notices` treats Upstash as hard-required; its `aiRatelimit.limit()` call is not protected. An Upstash outage or absent variables becomes a 500 before any notice work begins. Login handles the same dependency gracefully.
- **Highest serverless risk:** `POST /api/notices` executes Supabase download, `unpdf`/Tesseract extraction (WASM/workers/native canvas dependency), and then starts an unawaited AI task. Node.js runtime is correctly selected, but the work is still vulnerable to Vercel function time/memory limits and post-response termination. `POST /api/gst/reconcile` has the same unawaited-background-work pattern.
- **Environment drift:** `FAST2SMS_API_KEY` is referenced but absent from both checked-in `.env` and `.env.local` variable-name inventories. `FIELD_ENCRYPTION_KEY` is absent from `.env` but present in `.env.local`; it is required for production client create/update requests when a PAN is supplied. Actual Vercel Production values could not be verified.

## API inventory

| Route | Methods | Runtime |
|---|---|---|
| `/api/analytics` | GET | default Node.js |
| `/api/auth/login` | POST | default Node.js |
| `/api/auth/logout` | POST | default Node.js |
| `/api/auth/me` | GET | default Node.js |
| `/api/auth/register` | POST | default Node.js |
| `/api/billing/[id]` | GET, PATCH | default Node.js |
| `/api/billing/invoices` | GET, POST | default Node.js |
| `/api/clients/[id]` | GET, PATCH, DELETE | default Node.js |
| `/api/clients` | GET, POST | default Node.js |
| `/api/compliance/tasks` | GET, POST | default Node.js |
| `/api/dashboard/stats` | GET | default Node.js |
| `/api/documents` | GET, POST | default Node.js |
| `/api/documents/upload-url` | POST | default Node.js |
| `/api/gst/[id]` | GET | default Node.js |
| `/api/gst/reconcile` | GET, POST | default Node.js |
| `/api/health` | GET | default Node.js |
| `/api/notices/[id]/review` | POST | default Node.js |
| `/api/notices/[id]` | GET | default Node.js |
| `/api/notices` | GET, POST | **explicit `nodejs`** |
| `/api/portal/invite` | POST | default Node.js |
| `/api/portal/me` | GET | default Node.js |
| `/api/portal/request-otp` | POST | default Node.js |
| `/api/portal/set-pin` | POST | default Node.js |
| `/api/portal/verify-otp` | POST | default Node.js |
| `/api/portal/verify-pin` | POST | default Node.js |
| `/api/settings` | GET, PATCH | default Node.js |

No route opts into Edge. Default Node.js is correct for the routes importing Prisma, Node `crypto`, `Buffer`, or bcrypt. The only explicit runtime declaration is appropriate.

## Route diagnosis

Status meanings: **working** is backed by a production probe; **degraded** means static analysis found a hard dependency or deterministic degradation path, but the protected success path was not safely testable without credentials; **broken** means static source makes the requested capability fail under the stated condition.

| Route | Status | Root cause / dependencies | Evidence | Suggested fix |
|---|---|---|---|---|
| `/api/analytics` | Degraded | Hard Prisma/Neon DB dependency (many counts/aggregates). | Imports `lib/db/prisma`; all DB errors are converted to 500. | Add a DB readiness check and restore/provision persistent Postgres. |
| `/api/auth/login` | Degraded | Hard Prisma + `JWT_SECRET`; Upstash rate limit is fail-open. | Source catches `authRatelimit.limit()` errors, then queries Prisma and signs JWT. | Keep fail-open Redis handling; monitor DB/JWT configuration. |
| `/api/auth/logout` | Working | No external service; only clears cookie. | Static-only, no service call. | No dependency fix needed. |
| `/api/auth/me` | Degraded | Hard Prisma + valid `JWT_SECRET`. | Middleware and `verifyRequest` gate request; Prisma user/firm query follows. | Add authenticated synthetic check after DB recovery. |
| `/api/auth/register` | Degraded | Hard Prisma, `JWT_SECRET`, Node crypto/bcrypt. | One Prisma transaction; token signing throws for absent/short JWT secret. | Validate required auth/DB variables at startup/deploy. |
| `/api/billing/[id]` | Degraded | Hard Prisma/Neon DB. | GET/PATCH call Prisma for lookup and update. | Restore/provision DB and add authenticated smoke test. |
| `/api/billing/invoices` | Degraded | Hard Prisma/Neon DB. | GET aggregates and POST creates invoices through Prisma. | Restore/provision DB and add authenticated smoke test. |
| `/api/clients/[id]` | Degraded | Hard Prisma; PATCH with PAN also hard-requires `FIELD_ENCRYPTION_KEY`. | `encryptField()` throws in production if key missing. | Set/verify field-encryption key in Production; add config validation. |
| `/api/clients` | Degraded | Hard Prisma; POST with PAN requires `FIELD_ENCRYPTION_KEY`. | Same encryption helper and Prisma create/update-many. | Set/verify field-encryption key in Production; add config validation. |
| `/api/compliance/tasks` | Degraded | Hard Prisma/Neon DB. | Reads active clients/tasks and bulk-creates generated tasks. | Restore/provision DB and add authenticated smoke test. |
| `/api/dashboard/stats` | Degraded | Hard Prisma/Neon DB. | Parallel Prisma counts/aggregate operations; failures return 500. | Make dashboard surface a clear DB-unavailable state. |
| `/api/documents` | Degraded | Hard Prisma/Neon DB. | Lists/creates document metadata through Prisma. | Restore/provision DB and add authenticated smoke test. |
| `/api/documents/upload-url` | Degraded | Hard Prisma plus hard Supabase Storage service/URL/key/bucket. | Prisma ownership check then `createSignedUploadUrl`; storage errors become 500. | Verify Supabase variables/bucket and add a storage readiness/synthetic check. |
| `/api/gst/[id]` | Degraded | Hard Prisma/Neon DB. | Prisma reconciliation lookup; errors return 500. | Restore/provision DB and add authenticated smoke test. |
| `/api/gst/reconcile` | Degraded | Hard Prisma; optional AI explanation; background job may be terminated after response. | POST creates `PROCESSING`, calls unawaited `processRecon`; AI failure is caught, but job completion is not guaranteed in serverless. Anonymous probe returned expected 401. | Move reconciliation to a durable queue/job runner and retain the AI fallback. |
| `/api/health` | Working | Deliberately has no external dependency; not a DB readiness test. | Production `GET` returned **200 OK** (Vercel, `X-Matched-Path: /api/health`). | Add separate authenticated/secured dependency readiness checks. |
| `/api/notices/[id]/review` | Degraded | Hard Prisma/Neon DB. | Prisma notice lookup/update; errors return 500. | Restore/provision DB and add authenticated smoke test. |
| `/api/notices/[id]` | Degraded | Hard Prisma/Neon DB. | Prisma notice lookup; errors return 500. | Restore/provision DB and add authenticated smoke test. |
| `/api/notices` | **Broken/degraded** | POST hard-requires Upstash, Prisma, Supabase Storage, `unpdf`/Tesseract, and AI. It also starts unawaited AI work. | `aiRatelimit.limit()` is outside a catch; `extract-text.ts` imports `unpdf` and Tesseract; config traces those packages; anonymous GET returned expected 401. | Make rate limiting fail open/closed intentionally, put extraction/AI in durable work, and verify Node bundle/function limits. |
| `/api/portal/invite` | Degraded | Hard Prisma, `JWT_SECRET`; malformed invite URL if `NEXT_PUBLIC_APP_URL` absent. | Builds URL directly from `process.env.NEXT_PUBLIC_APP_URL`; no fallback/validation. | Require/validate public app URL at deploy. |
| `/api/portal/me` | Degraded | Hard Prisma + `JWT_SECRET`. | Verifies portal token then queries Prisma. | Validate JWT secret and add portal synthetic check. |
| `/api/portal/request-otp` | **Broken if SMS key absent** | Hard Prisma; Fast2SMS is silently replaced by logging OTP when `FAST2SMS_API_KEY` is missing. | Variable is absent from `.env` and `.env.local` inventories; source logs phone and OTP yet returns “OTP sent”. | Require Fast2SMS configuration in Production and fail visibly if delivery cannot occur. |
| `/api/portal/set-pin` | Degraded | Hard Prisma + `JWT_SECRET`; Node crypto/bcrypt. | Creates/updates portal session then signs portal token. | Validate auth/DB variables at deploy. |
| `/api/portal/verify-otp` | Degraded | Hard Prisma + bcrypt. | Reads/updates OTP and portal-session records. | Restore/provision DB and add a controlled OTP flow test. |
| `/api/portal/verify-pin` | Degraded | Hard Prisma + `JWT_SECRET`; Node crypto/bcrypt. | Reads/updates session then signs portal token. | Validate auth/DB variables at deploy. |
| `/api/settings` | Degraded | Hard Prisma/Neon DB. | Prisma firm/user reads and firm update. | Restore/provision DB and add authenticated smoke test. |

## Deployment-log cross-reference

No Vercel log query was possible: the repository has no Vercel project link/configuration and the available CLI invocation was unauthenticated. As a result, there are **no retrieved function errors to group by route or type** for the requested seven-day window. This is an evidence gap, not an indication of zero errors.

The only production request evidence collected was deliberately non-mutating:

| Endpoint | Result | Interpretation |
|---|---|---|
| `GET https://ca-saathi.vercel.app/api/health` | 200 OK | Deployment is reachable; proves neither database nor any provider dependency. |
| `GET https://ca-saathi.vercel.app/api/notices` | 401 Unauthorized | Middleware and route match are alive; protected handler/dependencies were not exercised. |
| `GET https://ca-saathi.vercel.app/api/gst/reconcile` | 401 Unauthorized | Same as above. |

## External-service and expiry-risk inventory

| Service | Code use | Failure mode | Inactivity/retention risk |
|---|---|---|---|
| Prisma via Neon/Postgres | 24 API routes | Hard failure (usually caught as generic 500). | **High:** any free-tier database pause/deletion/expiry makes nearly the whole product unavailable; health endpoint will not expose it. |
| Upstash Redis | Login rate limit; notice AI rate limit | Login degrades safely; notice POST fails with 500 before work begins. | **High:** current incident pattern directly applies; free-tier retention/inactivity policy must be monitored. |
| Supabase Storage | Upload signed URLs; notice file download | Hard 500 for storage outage/bad URL/key/bucket. | Medium: project/account quota or lifecycle/retention policy can remove access or objects. |
| Configured AI endpoint | Notice drafting; GST explanations | Notice creates record then background task marks it FAILED; GST returns reconciliation without AI explanations. | Medium: provider key/quota/model availability; no provider-specific client lock-in found. |
| Fast2SMS | Portal OTP delivery | Missing key logs sensitive OTP instead of sending it; non-2xx responses are not checked. | High functional/security risk while configuration is absent; provider account/credits can also expire. |
| Vercel serverless | All routes | Time/memory and post-response execution limit. | High for notice extraction and unawaited notice/GST background tasks; not an inactivity expiry but a platform lifecycle constraint. |

`bullmq`, `ioredis`, AWS S3/R2, Resend, web-push, and Anthropic appear in `package.json`, but no application source import or worker implementation was found. They do not currently create an exercised runtime dependency or additional inactivity risk.

## Runtime/bundling findings

- `/api/notices` correctly declares `runtime = "nodejs"`; it must not move to Edge because it uses `Buffer`, Node crypto transitively, Tesseract workers/WASM, and `unpdf`.
- `next.config.mjs` externalizes and traces `tesseract.js`, `tesseract.js-core`, and `unpdf` only for `/api/notices`. That is the only source import path using those packages, so the scoping is currently correct.
- `unpdf` has an optional `@napi-rs/canvas` dependency and Tesseract creates worker/WASM assets. The current trace configuration reduces missing-file risk but cannot prevent native/worker initialization failures or Vercel duration/memory timeouts. No deployment log was available to distinguish those causes.
- Every other route's default Node runtime is appropriate; none imports browser-only UI code, canvas, or workers.

## Production environment checklist (names only)

Observed local/config variable names: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`. `FIELD_ENCRYPTION_KEY` exists only in `.env.local`. `FAST2SMS_API_KEY` is referenced in source but absent from both local inventory files.

Vercel Production must be checked separately for the following required values: `DATABASE_URL`, `JWT_SECRET` (at least 32 chars), `FIELD_ENCRYPTION_KEY` (64 hex chars), Supabase URL/service key/bucket, Upstash REST URL/token, AI base URL/key/model, `NEXT_PUBLIC_APP_URL`, and `FAST2SMS_API_KEY` if portal OTPs are intended to send SMS.

## Recommended next diagnostic step

Grant read-only Vercel project/log access, then query the last seven days of function logs and group the results by the route markers already emitted in source (for example `[notices/POST]`, `[notices/ai-process]`, `[gst/recon-process]`). After that, run one authenticated, non-destructive database smoke check and one controlled notice upload in Production to separate database absence from `unpdf` worker/bundle/duration failures.
