# Distill: architecture and folder structure

Author: Maduabuchi Ogugua Dibiaezue
Status: draft, 25 Oct 2026. Written before the first build prompt, as the Assignment 2 brief requires.

## 1. What is being built

A mobile-first responsive web app. Designed at phone width (375 px) first, usable on a laptop. No native app.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| App framework | Next.js (App Router), TypeScript | One codebase for pages and the HTTP API. Well known to the agent. |
| Styling | Tailwind CSS | Fast to build phone-first layouts. Consistent spacing and colour tokens. |
| Database | PostgreSQL, hosted on Supabase | Postgres was chosen in Assignment 1. Not dependent on school resources or a teacher created account. |
| Database access | Drizzle ORM with SQL migrations in the repo | The schema lives in code and is reviewable, which matters because the data tables are graded. |
| Login | Supabase Auth with Google sign in | No passwords to store. Avoids Supabase's rate limited built in email. Each member is a real user, needed for agree and confirm. |
| Photo storage | Supabase Storage, private bucket | Receipt photos are kept and viewable by group members. |
| Keep alive | Daily Netlify Scheduled Function calling the keep alive endpoint, which runs one small database query | A free Supabase project pauses after a period of inactivity. The app must stay online through later assignments. |
| Receipt reading | Google Gemini API, called only from the server | Already used in the earlier pipeline. The API key never reaches the browser. |
| Hosting | Netlify | Public HTTPS address, as the brief requires. Allowed by the brief at own responsibility. Chosen over Vercel because Maduabuchi has used it before. |
| Unit tests | Vitest | Split, rounding, balance and period logic. |
| End to end tests | Playwright, phone viewport | Critical user flows. Gemini is replaced by a fixed fake response in tests. |

## 3. Architecture

Three layers. Each layer only calls the one below it.

```
Pages (src/app)                 API routes (src/app/api/v1)
        \                         /
         \                       /
          Services (src/server/services)
          checks membership, loads and saves data,
          calls domain logic and external services
                 |                    |
       Domain logic (src/domain)   Integrations (src/server/integrations)
       pure functions, no I/O      Gemini, Supabase Storage
                 |
       Database (src/server/db, Drizzle)
```

Rules:
1. **All business rules live in `src/domain`.** Splitting, rounding, balances, period dates, agreement reset. Pure TypeScript, no database or network imports. This is what the unit tests cover.
2. **Services are the only place that reads or writes the database.** Pages and API routes call services. No database calls inside components.
3. **The HTTP API is versioned (`/api/v1`) and covers every action a page can do.** Later assignments require other applications to reach the app, so the API is built now, not added later.
4. **Membership is checked in the service layer on every call.** A user can only read or change groups they belong to.
5. **Money is stored as integer cents.** Shares are stored as basis points (10000 = 100%). No floating point for money.
6. **Photos upload straight from the browser to Supabase Storage** using signed upload URLs, compressed in the browser first. They do not pass through Netlify functions, which limit request size. The server then reads them from storage for Gemini.
7. **Period closing is evaluated on request.** When any group data is loaded, the service closes every period whose end date has passed and opens the next one. No scheduled job is needed, and the logic is a testable pure function.

## 4. Folder structure

```
distill-app/
  CLAUDE.md                  project rules for the agent
  SPEC.md                    what is built, from the Assignment 1 user stories
  README.md                  how to run, test and deploy
  docs/
    ARCHITECTURE.md          this file
    DATA_MODEL.md            tables, keys and relations
    WORKLOG.md               one entry per build session: goal, prompts, how it was verified
    features/
      multi-photo-receipt.md
  src/
    app/
      (auth)/login/          sign in
      join/[token]/          invite link landing
      groups/new/            screen 1, new group
      groups/[groupId]/
        receipts/            screen 2, scan and recent receipts
        receipts/capture/    screen 2a, receipt photos
        receipts/[receiptId] screen 3, review receipt
        categories/          screen 4, categories and sharing rules
        balance/             current period balance and closed periods (screen 5)
        balance/payments/    screen 6, payment record
      api/v1/                HTTP API, one folder per resource
    components/              shared UI: tab bar, avatar, money, buttons, list rows
    domain/                  pure business logic
      money.ts               cents, formatting, largest remainder rounding
      split.ts               item shares from the category rule
      balance.ts             who owes whom for a period
      ledgers.ts             ledger (period) end dates, closing and opening
      agreement.ts           when agreements reset
    server/
      db/                    Drizzle schema, client, migrations
      services/              groups, receipts, categories, ledgers, payments
      integrations/
        gemini.ts            receipt reading
        storage.ts           photo upload and signed URLs (Supabase Storage)
      auth.ts                current user from the session
  tests/
    unit/                    Vitest, mirrors src/domain
    e2e/                     Playwright flows
    fixtures/                sample receipts and fake Gemini responses
```

## 5. Environments and secrets

- `.env.local` for local development, never committed. `.env.example` lists the names only.
- Variables: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CRON_SECRET`. Google sign in credentials are stored in the Supabase dashboard, not in the app.
- Netlify holds the production values.

## 6. Decisions still open


- Gemini model version: set through `GEMINI_MODEL`, chosen when the extraction service is built.
- Authentication for other applications calling the API: needed in a later assignment, not in this one.
