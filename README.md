# AskData AI

An AI data analyst. Ask a question about a database in plain English and get back
a written insight, a chart, the result table, and the exact SQL that produced them.

Built to show how a text-to-SQL agent can be made **safe enough to point at a real
database**: the model's SQL runs through a read-only Postgres role, a parser-based
validator, a statement timeout and an enforced row limit.

- **Ask** in plain English; watch the agent work step by step ("Reading schema…", "Running query…", "Fixing query…")
- **Verify** every answer: chart, data table, collapsible SQL with copy, CSV export
- **Pin** charts to a dashboard that re-runs their SQL on every load
- **Upload** a CSV and question it with the same safety rules
- **Switch models**: Google Gemini by default (free tier), OpenAI and Anthropic Claude when their keys are set

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Vercel AI SDK 7 ·
Neon Postgres · Prisma 7 · Auth.js v5 · TanStack Query · Recharts · zod

---

## Contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [How the agent works](#how-the-agent-works)
- [Safety layers](#safety-layers)
- [Demo data](#demo-data)
- [CSV uploads](#csv-uploads)
- [Evaluating accuracy](#evaluating-accuracy)
- [Tests](#tests)
- [Deploying to Vercel](#deploying-to-vercel)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)

---

## Quick start

You need Node.js 20.9+, a free [Neon](https://neon.tech) database and a free
[Google AI Studio](https://aistudio.google.com/apikey) API key.

```bash
npm install
cp .env.example .env
```

Fill in `.env`. Only four values are required:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → Connect → **pooled** connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | https://aistudio.google.com/apikey |
| `AUTH_SECRET` | `npx auth secret`, or any long random string |
| `ANALYTICS_ROLE_PASSWORD` | any long random string (becomes the read-only role's password) |

Then create everything in the database and start the app:

```bash
npm run db:init   # migrate app tables → create the read-only role → seed demo data
npm run dev
```

Open http://localhost:3000 and choose **Try the demo**. The demo login is
`demo@askdata.app` / `askdata-demo` (it is printed on the login page on purpose).

`db:init` is three steps you can also run one at a time:

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies the Prisma migration: the `app` schema (users, conversations, pins, uploads) |
| `npm run db:setup` | Creates the `askdata_readonly` role and the `analytics` / `uploads` schemas, then **verifies** the role cannot write or read app tables |
| `npm run db:seed` | Builds the demo e-commerce dataset and the demo account. Safe to re-run; it refreshes the data so "last month" is always recent |

---

## Architecture

```
Browser                         Next.js server                         Postgres (Neon)
───────                         ──────────────                         ───────────────
Chat UI ── POST /api/chat ────▶ auth check ─▶ agent loop
   ▲                              │  getSchema ─────────────────────▶ analytics.*  ┐ read-only role
   │   NDJSON stream              │  runQuery ─▶ validate ─▶ execute ▶ uploads.*   ┘ (askdata_readonly)
   └── steps + final answer ◀─────┤  submitAnswer
                                  │
Dashboard, history, uploads ────▶ REST routes ─▶ Prisma ────────────▶ app.*          owner role
```

Two database connections, kept apart on purpose:

- **Owner connection (Prisma).** App data only: users, conversations, pinned charts,
  upload metadata. It lives in the `app` schema. The agent never touches this connection.
- **Read-only connection (`pg` pool).** Logs in as `askdata_readonly`, which has
  `SELECT` on the `analytics` and `uploads` schemas and nothing else. Every piece of
  SQL written by a model, and every stored query a pinned chart re-runs, goes through
  this pool.

The UI is a static shell (Next.js Cache Components) with client-side data fetching
through TanStack Query, so pages load instantly and the API is the only thing that
reads the session. `src/proxy.ts` redirects signed-out visitors, and **every API
route re-checks the session itself**; the proxy is a convenience, not the boundary.

---

## How the agent works

The agent is a multi-step tool-calling loop on the Vercel AI SDK
([`src/server/agent/run-agent.ts`](src/server/agent/run-agent.ts)), capped at 10 model
steps and 50 seconds.

```
getSchema ──▶ runQuery ──▶ (error? read it, fix the SQL, runQuery again, up to 3 failures) ──▶ submitAnswer
```

| Tool | What it does |
| --- | --- |
| `getSchema` | Returns tables, columns, types, primary/foreign keys, column comments (business rules), sample values for text columns, value ranges for numeric/date columns, row counts and today's date. Cached in memory. |
| `runQuery` | Validates and executes one `SELECT`. Returns the columns, row count and the first 40 rows to the model, or the database's error message so the model can repair the query. |
| `submitAnswer` | Ends the run. Its zod-validated input is the structured answer: `answerable`, a 2–3 sentence `insight`, which query result to present, a chart spec (`type`, `x`, `y`, `title`, `yFormat`) and follow-up questions. |

Design decisions worth knowing:

- **The model must use tools.** `toolChoice: "required"` on every step, and the only
  way to finish is `submitAnswer`. A structured "answer tool" is more reliable across
  providers than asking for JSON in prose.
- **The schema is always read first, by the server.** Inspecting the schema has only
  one right answer, so the server runs `getSchema` itself at the start of every run
  (it shows as the first step in the trace) and hands the result to the model. That
  saves a full model round-trip per question. The tool stays available for re-reading.
- **Time budget and fallback.** A run has 50 seconds. If the model is overloaded
  before any query ran, the agent restarts once on the provider's lighter model. If
  the model fails after a query succeeded, the user still gets the chart and table.
- **The model never retypes data.** It picks a result by id; the rows shown in the
  table and chart come from the server's copy of the query result. The table and chart
  therefore cannot contain invented numbers.
- **No result, no figures.** If the model claims an answer without one successful
  query behind it, the server discards that claim and reports that it could not answer.
- **Honest refusals.** When the data cannot answer the question, the model sets
  `answerable: false` and explains what is missing. The UI shows this as a distinct
  "couldn't answer that from this data" state.
- **Self-repair is bounded.** After 3 failed queries the tool refuses further queries
  and the next step is forced to `submitAnswer`.
- **Chart specs are checked, not trusted.** Field names are validated against the
  real result columns; an unusable spec is repaired or downgraded to a table
  ([`src/lib/agent/chart.ts`](src/lib/agent/chart.ts)).
- **Live progress.** Each tool reports step updates that `/api/chat` streams to the
  browser as newline-delimited JSON, so the trace appears as the agent works.

Switching providers is a one-line change per provider in
[`src/server/ai/models.ts`](src/server/ai/models.ts). `AI_PROVIDER` picks the default;
the model picker in the sidebar lists only providers whose API key is configured.

---

## Safety layers

Each layer works on its own. Breaking one does not expose the database.

### 1. A separate read-only database role

Model-written SQL never runs on the app's connection. It runs as `askdata_readonly`,
created by `npm run db:setup`. The exact SQL is in
[`sql/01-readonly-role.sql`](sql/01-readonly-role.sql):

```sql
CREATE ROLE askdata_readonly WITH
  LOGIN PASSWORD 'CHANGE_ME'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;

ALTER ROLE askdata_readonly SET default_transaction_read_only = on;
ALTER ROLE askdata_readonly SET statement_timeout = '5s';
ALTER ROLE askdata_readonly SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE askdata_readonly SET search_path = analytics;

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS uploads;

GRANT USAGE ON SCHEMA analytics, uploads TO askdata_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO askdata_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA uploads TO askdata_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO askdata_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA uploads GRANT SELECT ON TABLES TO askdata_readonly;

REVOKE ALL ON SCHEMA app FROM askdata_readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM askdata_readonly;
```

The role has no privileges on the `app` schema, so the users table and password
hashes are invisible to it. `db:setup` finishes by logging in as the role and
confirming it cannot create a table or read `app."User"`.

### 2. SQL validation with a real parser

Before execution, [`src/server/sql/validate.ts`](src/server/sql/validate.ts) parses
the SQL into an AST with `node-sql-parser` (PostgreSQL grammar) and requires that:

- it parses, and is **exactly one statement**
- that statement is a `SELECT` (CTEs allowed). `INSERT`, `UPDATE`, `DELETE`, `DROP`,
  `ALTER`, `TRUNCATE`, `GRANT`, `SET`, `COPY`, `SELECT … INTO` and `FOR UPDATE` are rejected
- **every table is on the request's allow-list**: the analytics tables plus the
  asking user's own uploads. That excludes the app's tables, other users' uploads,
  `information_schema` and `pg_catalog`, including unqualified catalog names and
  catalogs "shadowed" by a CTE name
- it calls **no dangerous function**: `pg_*`, `dblink*`, `lo_*`, `set_config`,
  `current_setting`, `query_to_xml` and similar, and any schema-qualified function

### 3. Statement timeout

Queries run with `SET LOCAL statement_timeout` (default 5 s, `QUERY_TIMEOUT_MS`).
Postgres cancels anything slower. The role carries the same limit as a default, so
it applies even if application code forgot.

### 4. Automatic row limit

A validated query is wrapped as `SELECT * FROM (<query>) AS askdata_result LIMIT n+1`
(default 500, `QUERY_ROW_LIMIT`). The cap holds whatever `LIMIT` the model wrote, and
the extra row tells the UI the result was truncated.

### 5. Read-only transaction, pinned search path

Each query runs inside `BEGIN TRANSACTION READ ONLY` with `search_path` pinned to
`analytics`, and is always rolled back.

### 6. Schema exposure

`getSchema` describes only the allow-listed tables. The model is never told the app
tables exist.

### 7. Secrets stay on the server

Database URLs and API keys are read only in modules that import `server-only`, which
makes importing them from client code a build error. The browser receives model ids
and labels, never keys.

### Also in place

- Pinned charts get no special trust: their stored SQL passes through layers 1–5 again on every load.
- CSV cell values are sent as bind parameters; identifiers are rebuilt from scratch (`a–z`, `0–9`, `_`) and quoted.
- Conversations, pins and uploads are scoped by user id in every query.
- CSV export neutralises spreadsheet formula injection.
- The sign-in `callbackUrl` only accepts same-origin `/app` paths (no open redirect).
- The shared demo account has a daily question quota (`DEMO_DAILY_QUESTIONS`).

### Known limits

- Isolation between different users' uploads is enforced by the validator's
  allow-list (application layer). The database role can read the whole `uploads`
  schema. Per-user roles or row-level security would move that into the database.
- Function blocking is a deny-list. The read-only role and timeout are what bound
  the damage if a function is missed.

---

## Demo data

`npm run db:seed` builds an e-commerce dataset in the `analytics` schema:
`customers`, `products`, `orders`, `order_items`, `refunds`. Roughly 1,400 customers,
46 products, 9,400 orders and 20,000 line items across the last 12 months.

The generator ([`scripts/lib/dataset.ts`](scripts/lib/dataset.ts)) is deterministic
and bakes in patterns so charts have something to show: steady growth across the year, a
November–December peak with a Black Friday week, a few best-sellers and a long tail,
a loyal minority of repeat customers, category seasonality, refund rates that differ
by category, regions of different size, and mobile's share of orders rising.

Column comments carry business rules ("revenue excludes cancelled and refunded
orders"). The agent reads them through `getSchema`, which is how it learns them.

---

## CSV uploads

On **Upload data**, a CSV is parsed in the browser, column types are inferred, and
you can correct them before anything is sent. The server re-parses the file with the
same inference code, creates a table `uploads.u_<user>_<file>` and loads the rows.

- Limits: 4 MB (`UPLOAD_MAX_MB`), 50,000 rows, 40 columns, 5 tables per user
- Types: text, number, date, boolean. Currency symbols, thousands separators and percent signs are understood
- Uploads expire after 7 days (`UPLOAD_TTL_DAYS`). A daily Vercel Cron job (`vercel.json`) drops expired tables, and the list endpoint also cleans up on access
- The agent sees a user's uploads next to the demo tables and queries them under the same safety rules

---

## Evaluating accuracy

```bash
npm run eval
```

[`scripts/eval/cases.ts`](scripts/eval/cases.ts) holds 17 questions: 15 answerable
ones (totals, rankings, breakdowns, trends) and 2 that the data cannot answer. Each
answerable case carries a hand-written **gold SQL** query. The runner sends the
question through the real agent, runs the gold query for the true answer, and checks
the agent's result rows against it. The two unanswerable cases pass only if the agent
declines. Because the truth is computed from the live data, the suite keeps working
after a re-seed.

```
✔ revenue-last-month            6.1s  found 198879.2
✔ top-products-last-month       7.4s  matched wireless earbuds pro > merino crew sweater > …
✖ aov-by-channel                5.9s  web: expected 229.36, got [231.02]
    SQL: SELECT channel, avg(total_amount) …

Accuracy: 16/17 (94%) · avg 6.3s per question
```

(Illustrative output. Run it against your own key to get real numbers.)

Options: `--only <text>` filters cases by id, `--model <id>` picks a model
(for example `openai:gpt-5.4-mini`), `--delay <ms>` spaces out calls for free-tier
rate limits, `--min <0..1>` sets the pass threshold. The process exits non-zero below
the threshold, so it can gate CI.

---

## Tests

```bash
npm test          # unit tests (no database or API key needed)
npm run typecheck
npm run lint
```

- `tests/sql-validate.test.ts`: about 50 accept/reject cases for the SQL validator
- `tests/agent.test.ts`: the agent loop against the AI SDK's mock model: normal flow, self-repair, retry cap, honest refusal, chart repair, provider errors
- `tests/lib.test.ts`: chart-spec resolution, CSV type inference, CSV export escaping, callback URL validation

---

## Deploying to Vercel

1. Push the repository to GitHub and import it at https://vercel.com/new.
2. Under **Environment Variables**, add `DATABASE_URL`, `DIRECT_URL` (the same
   Neon string without `-pooler` in the host), `ANALYTICS_ROLE_PASSWORD`,
   `AUTH_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_PROVIDER=google` and `CRON_SECRET`.
   Use the same `ANALYTICS_ROLE_PASSWORD` you ran `db:setup` with.
3. Deploy. Vercel runs the `vercel-build` script, which applies migrations before building.
4. If you have not already, run `npm run db:setup` and `npm run db:seed` once from
   your machine with the production `DATABASE_URL` in `.env`.

Notes for the free (Hobby) tier:

- `/api/chat` sets `maxDuration = 60`, within the Hobby limit.
- Vercel rejects request bodies above 4.5 MB, which is why uploads default to 4 MB.
- Hobby cron jobs run once a day; `vercel.json` schedules the upload clean-up for 04:00 UTC.
- Gemini's free tier allows only a few requests per minute, each question is two or
  more requests, and at busy times the free models answer slowly or return "high
  demand" errors. The app handles this with a fallback model, a 50-second budget and a
  clear message, but a paid key (or OpenAI / Claude) gives a much smoother demo.
- `npm run eval` sends 17 questions (roughly 40 to 60 model requests). On a free key,
  run it sparingly and raise `--delay`.

---

## Environment variables

Documented in full in [`.env.example`](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Owner connection (pooled). App data, migrations, seeding |
| `DIRECT_URL` | no | Non-pooled connection for migrations. Derived from `DATABASE_URL` if empty |
| `ANALYTICS_ROLE_PASSWORD` | yes | Password of the read-only role |
| `ANALYTICS_DATABASE_URL` | no | Read-only connection string. Derived from the two above if empty |
| `AUTH_SECRET` | yes | Signs session cookies |
| `AI_PROVIDER` | no | Default provider: `google` (default), `openai` or `anthropic` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | one of three | Gemini |
| `OPENAI_API_KEY` | optional | Enables OpenAI models in the picker |
| `ANTHROPIC_API_KEY` | optional | Enables Claude models in the picker |
| `QUERY_ROW_LIMIT` | no | Max rows per query (500) |
| `QUERY_TIMEOUT_MS` | no | Statement timeout (5000) |
| `UPLOAD_MAX_MB` / `UPLOAD_TTL_DAYS` | no | Upload size limit (4) and lifetime (7) |
| `DEMO_DAILY_QUESTIONS` | no | Daily quota for the demo account (150) |
| `CRON_SECRET` | for cron | Protects the clean-up endpoint |

---

## Project structure

```
prisma/                  App schema + migration (schema `app`)
sql/                     Read-only role SQL and analytics DDL (readable, runnable by hand)
scripts/
  db-setup.ts            Create + verify the read-only role
  seed.ts                Load demo data and the demo account
  lib/dataset.ts         Deterministic dataset generator
  eval/                  Eval cases and runner
tests/                   Unit tests (validator, agent loop, helpers)
src/
  proxy.ts               Redirects signed-out visitors (Next.js 16 "proxy")
  app/
    (marketing)/         Landing page
    (auth)/              Login, sign-up
    app/                 Workspace: chat, conversation, dashboard, upload
    api/                 Route handlers: chat (streaming), conversations, pins, uploads, models, …
  server/                Server-only code
    agent/               Agent loop and system prompt
    ai/                  Provider registry (Gemini / OpenAI / Claude)
    sql/                 Validator, guarded executor, schema introspection
    db/                  Prisma client and pg pools
    auth/                Auth.js configuration
    services/            Conversations, pins, uploads, dashboard overview
  features/              UI by feature: chat, dashboard, upload, auth, marketing, workspace
    <feature>/components/
    <feature>/hooks/
  components/            Shared UI: charts, data table, SQL block, buttons, providers
  lib/                   Isomorphic helpers: types, chart logic, formatting, CSV, validation
```

Before publishing, set your name and repository link in [`src/lib/site.ts`](src/lib/site.ts).
