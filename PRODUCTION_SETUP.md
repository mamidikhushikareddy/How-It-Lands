# Production Setup

This is the exact path from "no database" to "running in production."
Everything here has been tested for real — the migration runner was run
against a database created from nothing, and the compiled production
bundle (`node dist/server.cjs`, not the dev server) was booted against it
and exercised over real HTTP.

## What I cannot do for you

I don't have the ability to create accounts, provision cloud
infrastructure, or generate a working `DATABASE_URL` on your behalf — that
requires an account tied to you, with your billing. Steps 1–2 below are
the only parts that are actually on you; everything after that is a
scripted, repeatable process.

## 1. Provision Postgres

Create an account with a managed Postgres provider. Recommended: **Neon**
(neon.tech) — pooled connection string built in (important: without a
pooler, a handful of server instances under real traffic will exhaust
Postgres's connection limit), automatic backups, and branching for
staging environments. Supabase is a fine alternative if you want one
dashboard for more than just the database.

Create a project, then copy the **pooled** connection string (Neon shows
both a direct and a `-pooler` URL — use the pooler one for the running
app; the direct one is only for one-off admin work).

## 2. Set environment variables

Wherever you deploy (your host's environment variable settings — Render,
Railway, Fly.io, a VPS's systemd unit, etc.):

```
DATABASE_URL=<your pooled connection string>
SIGNING_SECRET=<generate below>
WEBHOOK_SECRET=<generate below>
NODE_ENV=production
```

Generate the two secrets (never reuse the same value for both, and never
commit them to source control):
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run that twice, once for each secret. The app refuses to start if either
is missing — this is intentional (see `server/billingGateway.ts`), so you
can't accidentally deploy with a forgeable webhook secret.

Optional but recommended once you're ready for real users:
```
SMTP_USER=<your transactional email provider's SMTP username>
SMTP_PASS=<...>
GEMINI_API_KEY=<your Google AI Studio key>
```
Without `SMTP_USER`/`SMTP_PASS`, emails (verification codes, password
resets) are logged to the server console instead of actually sent —
fine for testing, not for real users. Without `GEMINI_API_KEY`, the AI
analysis feature runs in a mock/fallback mode.

## 3. Run migrations

One command, safe to run on every deploy (it only applies what hasn't
been applied yet — see `scripts/migrate.ts`):

```
DATABASE_URL=<your connection string> npm run migrate
```

Expected output on first run:
```
[MIGRATE] 9 pending migration(s): 001_core_identity.sql, ...
[MIGRATE] ✓ 001_core_identity.sql
...
[MIGRATE] Done. 9 migration(s) applied.
```

On every run after that, until a new migration file is added:
```
[MIGRATE] Database is up to date. 9 migration(s) already applied, nothing to do.
```

## 4. Build and start

```
npm install
npm run build
npm start
```

`npm start` runs the actual compiled production bundle
(`dist/server.cjs`), not the TypeScript dev server — this is what I
tested in step 5 below, not `npm run dev`.

## 5. Verify

```
curl https://your-domain.com/api/state
```
Should return `401 {"error":"Not authenticated."}` — that's correct for
an unauthenticated request (and confirms the auth-bypass bug from the
original audit stays fixed). Then try signing up through the actual
frontend.

## Still true from MIGRATION_STATUS.md

Real Stripe integration, an automated test suite, and a frontend/
accessibility review are still open — this setup gets the app running
correctly for real users on a real database, it doesn't complete every
item from the original audit. See that file for the full list.
