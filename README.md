# How It Lands

A message-analysis and communication-coaching app: paste a draft message, get a strategic breakdown of how it'll land, AI-powered rewrites, a real-time coaching chat, and a conversation-path simulator that previews how the exchange could go before you send anything.

This app has **no billing** — every account gets full access to every feature.

---

## Prerequisites

- **Node.js 20+** (check with `node -v`)
- **PostgreSQL** — either a local instance or a hosted one (e.g. [Neon](https://neon.tech), which gives you a free pooled connection string)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) (optional — the app runs in a graceful offline fallback mode without one, but real AI responses need this)

---

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file from the template
cp .env.example .env
```

Open `.env` and fill in real values — at minimum:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
SIGNING_SECRET="<generate — see below>"
WEBHOOK_SECRET="<generate — see below>"
```

Generate the two secrets (run this twice — use a **different** output for each):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The app will refuse to start without `DATABASE_URL`, `SIGNING_SECRET`, and `WEBHOOK_SECRET` set — that's intentional, not a bug.

For AI features (analysis, the Coach, the Conversation Path Simulator), also set `GEMINI_API_KEY`. For Google Sign-In and outbound email (verification codes, password resets), see `.env.example` for the remaining fields and comments on each.

```bash
# 3. Set up the database schema (safe to re-run — already-applied
#    migrations are skipped automatically)
npm run migrate
```

---

## Running in development

```bash
npm run dev
```

This starts the app on **http://localhost:3000** with hot-reload. Use this while you're actively making changes.

---

## Running in production

Production is a **two-step process** — you must run both commands, in order, every time you want to see new changes:

```bash
npm run build
npm start
```

- `npm run build` compiles the frontend and backend into the `dist/` folder.
- `npm start` runs the **already-compiled** `dist/` output — it does *not* rebuild anything.

**This is the single most common source of "I don't see my changes" confusion**: if you edit source code and only run `npm start` (without rebuilding first), you're still looking at the old `dist/` build. Always rebuild before restarting:

```bash
npm run build && npm start
```

> **Windows PowerShell note:** use `&&` to chain commands (run build, then start), not `>>` — that's a file-append redirect in PowerShell, not a command separator, and will silently redirect output into a file instead of running the second command.

### If port 3000 is already in use

This means a previous server process (from an earlier `npm start` or `npm run dev`) is still running in the background — usually left over from a prior terminal window. Find and stop it first:

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :3000
taskkill /PID <the number in the last column> /F
```

**macOS/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

Then run `npm run build && npm start` again.

### If your browser still shows the old version after rebuilding

The server is configured to prevent this (`index.html` is served with `no-cache` headers, and every build produces new content-hashed filenames for JS/CSS — so a stale copy is never served under the new URLs). If you still suspect you're looking at an old build after rebuilding:

1. Hard-refresh the page: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac), or open the app in an incognito/private window.
2. Confirm the terminal running `npm run build` actually finished successfully and printed a new `dist/assets/index-<hash>.js` filename (the hash changes on every build — if you see the exact same hash as last time, the rebuild didn't pick up your changes).
3. Make sure you don't have a second, older instance of the app running on a different port that you're actually looking at.

---

## Quick reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run migrate` | Apply any pending database migrations (safe to re-run) |
| `npm run dev` | Run in development mode with hot-reload |
| `npm run build` | Compile frontend + backend into `dist/` |
| `npm start` | Run the compiled `dist/` build (run `npm run build` first) |
| `npm run lint` | Type-check the whole project with no emitted output |
| `npm run clean` | Remove build output |

**Typical first run:**
```bash
npm install
cp .env.example .env    # then fill in real values
npm run migrate
npm run build
npm start
```

**After making changes, to see them in production mode:**
```bash
npm run build && npm start
```

---

## Notifications

Three notification triggers, each controlled per-account in Profile Settings → Notification Trigger Settings:

- **Analysis Reports & Diagnostics Log summaries** — emailed automatically right after each analysis completes.
- **Strict Compliance Security Alerts** — emailed immediately on a sign-in from an unrecognized device, 2FA being enabled/disabled, or a password change.
- **Monthly Conversation alignment reports** — emailed once a month with real trend data (analysis count, average score, most common landing status, how many were saved) for the previous calendar month.

The first two fire automatically as part of normal request handling — nothing to configure beyond having SMTP credentials set (see `.env.example`). The monthly report needs a scheduler to trigger it, since there's no user request that naturally happens once a month:

- On Render, the included `render.yaml` sets this up automatically as a Cron Job (`how-it-lands-monthly-reports`, runs 09:00 UTC on the 1st of each month).
- Anywhere else, trigger it yourself on a monthly schedule with:
  ```bash
  curl -X POST -H "x-cron-secret: $INTERNAL_CRON_SECRET" "$APP_URL/api/internal/notifications/monthly-report"
  ```
  This requires `INTERNAL_CRON_SECRET` to be set in `.env` — generate it the same way as `SIGNING_SECRET`/`WEBHOOK_SECRET`. Without it configured, the endpoint refuses to run rather than running unauthenticated.

---

## Deploying to Render

This repo includes a `render.yaml` [Blueprint](https://render.com/docs/blueprint-spec) that provisions both the web service and a managed Postgres database in one step, with the connection string wired automatically.

### Option A: Blueprint (recommended — one step)

1. Push this repo to GitHub or GitLab.
2. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Blueprint**, and point it at your repo.
3. Render reads `render.yaml` and provisions:
   - A free-tier Postgres database (`DATABASE_URL` gets wired to the web service automatically — you don't set this manually)
   - The web service itself, with `SIGNING_SECRET` and `WEBHOOK_SECRET` auto-generated
4. Render will prompt you to fill in the remaining values it can't generate on its own: `GEMINI_API_KEY`, `APP_URL` (your Render service's public URL, e.g. `https://how-it-lands.onrender.com`), and optionally the Google OAuth and SMTP fields.
5. Click **Apply** — Render builds and deploys. Migrations run automatically as part of the build (`npm run migrate` is included in the build command), so there's no separate manual migration step.

### Option B: Manual web service (no Blueprint)

If you'd rather not use the Blueprint, create the service by hand with these exact settings:

| Setting | Value |
|---|---|
| **Runtime** | Node |
| **Build Command** | `npm install --include=dev && npm run build && npm run migrate` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

The `--include=dev` flag in the build command matters: if you set `NODE_ENV=production` as an environment variable (which you should, for the app's own runtime behavior), Render also applies that during the *build* step — and npm's default behavior is to skip `devDependencies` whenever `NODE_ENV=production` is set. Since `vite`, `esbuild`, and `typescript` (all required just to build the app) live in `devDependencies`, leaving out `--include=dev` makes the build fail with something like `vite: not found`.

Then add a Postgres database (Render's managed Postgres, or any external provider like Neon) and set these environment variables on the web service:

```
DATABASE_URL=<your Postgres connection string>
SIGNING_SECRET=<generate with the command below>
WEBHOOK_SECRET=<generate with the command below — different value than SIGNING_SECRET>
NODE_ENV=production
GEMINI_API_KEY=<your key>
APP_URL=<your Render service's public URL>
```

Generate each secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Why the port matters

The app reads the port to listen on from the `PORT` environment variable (falling back to 3000 only when `PORT` isn't set, e.g. local development). Render assigns this dynamically and health-checks whatever port your app actually binds to — this is already handled correctly in `server.ts`, nothing for you to configure, just noting it here since a hardcoded port is one of the most common reasons a Node app deploys "successfully" on Render but is never actually reachable.

### Health check

`GET /api/health` returns `200 { status: "healthy", database: { healthy: true, latencyMs: ... } }` when the app can reach the database, and `503` otherwise. This is what Render's health check hits — if a deploy is stuck "unhealthy," check this endpoint directly first; it tells you whether the app itself is up but can't reach Postgres, versus not being up at all.
