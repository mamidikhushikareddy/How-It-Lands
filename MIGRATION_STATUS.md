# Migration Status — Read This First

## What changed since the last status doc

The full atomic migration is complete. Every route that touched the old
JSON file store (`loadDB`/`saveDB`) now goes through the Postgres
repository layer. `server.ts` went from 3,523 lines to ~1,140 (auth, 2FA,
OAuth, admin, billing, and app routes moved into `server/routes/*.ts`;
only AI orchestration — analyze/coach/transcribe — and boilerplate remain
inline). This was **not** a mechanical find-and-replace: I read every
route's actual business logic and ported it, and live-tested every domain
against a real Postgres instance with a real running server, not just
compiled it.

**How to verify this yourself:** `DATABASE_URL=... SIGNING_SECRET=... WEBHOOK_SECRET=... npx tsx server.ts`, then exercise any endpoint. Or run `npx tsx scripts/verify_db_layer.ts` for the repository-layer smoke test.

## Domains migrated and live-tested (not just compiled)

- **Auth**: signup, login, logout, logout-all-devices, verify-email, resend-verification, forgot/reset-password, change-password
- **2FA**: setup, verify, disable, login-verify — tested with a real computed TOTP code, full round trip (login → 2FA challenge → verify → session issued)
- **OAuth**: callback (new + existing user), link, unlink
- **Admin**: list/create/update/delete users, role-escalation guard, content CRUD (templates/playbooks/blog/testimonials), audit logs
- **Billing**: upgrade, plans, cancel/resume/pause, coupon validation, credits buy/consume, premium packs, promo codes, trial activate/cancel, invoice PDF download
- **Admin billing**: plan configuration, test-suite diagnostic, subscription-lapse cron simulation, MRR/ARR/revenue reports (real SQL aggregates, not a JS loop over every user), refunds (partial + full)
- **Webhooks**: signature verification, idempotent processing under simulated concurrent delivery, bad-signature rejection
- **App**: state bundle, profile, onboarding, analyses save/delete, privacy export/delete-account
- **Reliability**: every route file is wrapped so an unhandled async error returns a proper error response instead of crashing the process

## Critical bugs found and fixed (live-testing caught these; static review hadn't)

1. **Unhandled async errors crashed the entire server process.** Express 4 doesn't forward a rejected Promise to error-handling middleware automatically. One bad request (a database error, anything) took down the server for every connected user. Fixed with `server/middleware/asyncHandler.ts`, applied to every route file.
2. **Webhook endpoint was mounted at the wrong URL** (`/api/billing/webhooks/gateway` instead of `/api/webhooks/gateway`) during the initial route split — would have 404'd every real payment-gateway webhook in production. Caught by testing the actual documented path, not just "a" path.
3. **Admin billing routes had the same mounting bug** (`/api/billing/admin/...` instead of `/api/admin/billing/...`) — fixed by splitting into a dedicated `adminBillingRouter`.
4. **Account deletion violated its own database constraint.** Scrubbing PII by nulling both `password_hash` and `oauth_provider` simultaneously violated the `chk_password_or_oauth` CHECK constraint added in migration 001. Fixed with a random unusable sentinel hash instead of NULL.
5. **Premium packs had no real catalog anywhere** — not in the schema, not in `db.json`, not in the frontend. The original route trusted the client to supply both the pack ID and its price with zero server-side validation, meaning a caller could unlock any "pack" for any cost. Added a real seeded catalog with server-enforced pricing.
6. **Postgres couldn't infer a parameter's type** in the invoice-creation query (used both as an enum column value and compared against a text literal) — this didn't just error, it crashed the process (see #1; this bug is what exposed #1). Fixed with explicit casts.
7. **Fraud-risk velocity checking was silently non-functional** — it read failed-payment history from the old JSON audit log, which nothing writes to anymore. Rewired to query the real audit log.
8. **`usage_count_month` was incremented but never actually read.** The free-tier gate instead recounted all-time saved analyses against a hardcoded `3`, disconnected from the plan's configured 5/month limit — meaning deleting old analyses could reset a user's "free" allowance. Fixed to use the real counter against the real configured limit.
9. **Admin user creation returned stale data** (pre-update object) so the `plan` field in the response never reflected what was actually set.
10. **Admin billing reports crashed** on an enum/text type mismatch in a JOIN.
11. **`/api/security/metrics` leaked every user's audit log to any authenticated caller**, not just their own.

Plus the six from the previous pass (unauthenticated admin bypass, admin self-registration backdoor, password-reset/verification-code leaks in API responses, user enumeration, hardcoded webhook secret fallback) — all still in effect, now integrated rather than standalone patches.

## Also cleaned up

- Removed dead code left over from the migration: unused `loadDB`/`saveDB` imports and functions in `server/auth.ts`, `server/billingEngine.ts`, `server/security.ts` (`createSession`, `getBillingPlans` had zero remaining callers after the cutover). `server/security.ts`'s `logSecurityEvent` is still used internally by the WAF middleware in that same file — kept, but rewired to the real audit repo instead of the dead JSON file.
- `server/db.ts` (the old JSON-file store) is no longer imported by any application code path. It still exists on disk but nothing loads it.

## What's genuinely still open

- **Real Stripe integration.** Billing is still a fully simulated gateway. This is the biggest remaining blocker for actually charging real money — see the original audit for why (raw card fields, no real PSP).
- **Test suite.** Everything in this pass was verified through live HTTP requests against a real database, which is real evidence but not a substitute for an automated regression suite that runs in CI. No test runner is wired into `package.json` yet.
- **Frontend / accessibility review.** Not touched in this pass — the frontend already calls the same API contracts, so it should work unmodified, but hasn't been audited for the WCAG/UX items from the original scope.
- **`server.ts` could be decomposed further.** Analyze/coach/transcribe are still inline (~900 lines of AI prompt orchestration) — left in place deliberately to avoid transcription risk on a large prompt-engineering block, but a future pass could extract them into `server/routes/analysis.routes.ts`.
- **CI/CD, Docker, staging config.** Not reviewed.
- **In-memory state that won't survive horizontal scaling**: the rate limiter (`server/security.ts`) and the 2FA pre-auth token store (`server/routes/auth.routes.ts`) are both process-local `Map`s. Fine for a single instance; need Redis (or similar) before running more than one server process.

## Recommended next session

Given the backend is now on a consistent, real database with every route
migrated and live-verified, the two highest-value next steps are: (1) real
Stripe integration, since that's the actual go-live blocker, and (2) a
test suite, since "I manually verified it live" doesn't scale as a
regression-prevention strategy once more people are changing this code.
