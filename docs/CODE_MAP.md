# Distill: code map

Author: Maduabuchi Ogugua Dibiaezue
Last updated: 5 Nov 2026, end of build step 1 (sign in and groups).

This document lists every file in the repository, what it holds and the main functions in it. Use it to find where something lives before changing it. For why a rule exists, see [BUSINESS_RULES.md](BUSINESS_RULES.md). For the tables, see [DATA_MODEL.md](DATA_MODEL.md).

Keep it current: any change that adds, removes, renames or moves a file or a main function updates this document in the same commit (CLAUDE.md).

## How the code is organised

The app has three layers. Each one only calls the layer below it.

1. **Screens and API** (`src/app`): what the user sees, and the same actions offered to other applications under `/api/v1`. They hold no business rules.
2. **Services** (`src/server/services`): the only code that reads or writes the database. Every call checks that the user is a member of the group.
3. **Business rules** (`src/domain`): plain calculations such as splitting cents and working out close dates. No database, so they can be tested on their own.

Where to look when something needs changing:

| If you want to change... | Look in |
|---|---|
| How money is split or rounded | `src/domain/money.ts` |
| When a period closes, what the next period is | `src/domain/ledgers.ts` |
| What the New group form accepts | `src/domain/groups.ts` |
| Who can see or join a group | `src/server/services/groups.ts` |
| What a screen shows | the `page.tsx` under `src/app` for that route |
| A table or column | `src/server/db/schema.ts`, then a new migration, then `docs/DATA_MODEL.md` |
| The colours and fonts | `src/app/globals.css` |

## Root of the repository

| File | What it is |
|---|---|
| `CLAUDE.md` | Rules the LLM agent follows in every build session. |
| `SPEC.md` | What is built: stories, business rules, screens, build order. The source of truth. |
| `README.md` | How to run the app locally, and links to the documents. |
| `package.json` | Libraries the app uses and the commands (`npm run dev`, `npm test` and so on). |
| `vercel.json` | Hosting settings: servers in Dublin, next to the database, and the daily keep alive job at 06:17 UTC. |
| `drizzle.config.ts` | Settings for the tool that creates and runs database migrations. |
| `playwright.config.ts` | End to end test settings, phone sized browser. |
| `vitest.config.ts` | Unit test settings. |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` | Standard setup for the framework, TypeScript, the linter and the styling tool. Not changed by hand so far. |
| `.env.example` | Names of the secret settings the app needs. The values live in `.env.local` (never committed) and on Vercel. |

## docs

| File | What it is |
|---|---|
| `ARCHITECTURE.md` | Stack, layers and the planned folder structure, written before the build. |
| `DATA_MODEL.md` | Every table and column in plain terms. |
| `API.md` | The `/api/v1` endpoints for other applications. |
| `BUSINESS_RULES.md` | Each SPEC.md rule, whether it is built, and the files that enforce it. |
| `CODE_MAP.md` | This file. |
| `WORKLOG.md` | One entry per build session: goal, what changed, how it was checked. |
| `features/multi-photo-receipt.md` | Detail of the multi photo receipt change (build step 4). |

## src/domain: business rules

| File | What it holds | Main functions | Rules |
|---|---|---|---|
| `money.ts` | Splitting and showing money | `splitCents` splits an amount between people so the parts add up exactly. `formatCents` shows cents as 12,90. `FULL_SHARE_BP` is 100% (10000). | 11, 15 |
| `ledgers.ts` | Period dates | `validateCloseSetting` checks a close choice. `nextCloseDate` finds the next close date. `firstLedger` and `nextLedger` give a period's start and end. `describeClose` gives the sentence shown on Join. `daysUntil` gives the days left. | 18, 19 |
| `groups.ts` | New group form check | `validateNewGroup` returns a message per field, or none when valid. | 18, US1 |

## src/server: data and sign in

| File | What it holds | Main functions |
|---|---|---|
| `services/groups.ts` | Groups, members, invites | `listMyGroups`, `createGroup` (group, first member and first period in one step), `getGroupForMember` (members only), `getInvite`, `joinByToken`. |
| `services/users.ts` | The app's record of each person | `ensureUser` creates the user's row on first sign in. |
| `services/system.ts` | Health and keep alive | `keepAlive` stops the free Supabase project from pausing. `databaseIsUp` for the health check. |
| `services/errors.ts` | Expected failures | `ServiceError` (invalid, not found, not signed in) and `STATUS`, the HTTP code for each. |
| `auth.ts` | Who is signed in | `currentUser` for pages, `apiUser` for the API (cookie or bearer token). |
| `session.ts` | Sign in guard for pages | `requireUser` sends signed out users to Sign in and back afterwards. |
| `pageData.ts` | Shared page loading | `groupOr404` loads a group or shows Not found. |
| `api.ts` | Shared API behaviour | `withUser` (sign in required, same error format everywhere), `readJson`. |
| `db/client.ts` | The database connection | `db`, used only by services. |
| `db/schema.ts` | All 12 tables | One definition per table, with the database level checks that protect business rules. |
| `db/migrations/` | Database changes in order | `0000_init.sql` creates all tables. `0001_enable_rls.sql` blocks the browser from reading tables directly. `0002_category_changes.sql` adds the category history table. Generated by the tool; once applied they are never edited. |

Planned, not yet created: `services/receipts.ts`, `services/categories.ts`, `services/ledgers.ts`, `services/payments.ts`, `integrations/gemini.ts`, `integrations/storage.ts`, and in `src/domain`: `split.ts`, `balance.ts`, `agreement.ts` (ARCHITECTURE.md section 4).

## src/lib and src/middleware.ts

| File | What it holds |
|---|---|
| `lib/supabase/browser.ts` | Supabase connection in the browser, for sign in only (later also photo uploads). |
| `lib/supabase/server.ts` | Supabase connection on the server, to read the sign in session. |
| `middleware.ts` | Runs before every page and keeps the sign in session fresh. |

## src/app: screens

Screen numbers match SPEC.md section 5.

| Route | File | Screen | Status |
|---|---|---|---|
| `/` | `page.tsx` | No screen. Sends the user to Sign in, Start or Home. | Built |
| `/login` | `login/page.tsx`, `login/SignInButton.tsx` | 0, Sign in with Google | Built. Changing display name not built yet. |
| `/start` | `start/page.tsx` | 0a, Start: create a group or use an invite link | Built |
| `/join/<code>` | `join/[token]/page.tsx` | 0b, Join a group | Built |
| `/groups/new` | `groups/new/page.tsx`, `groups/new/NewGroupForm.tsx` | 1, New group | Built |
| `/groups/<id>` | `groups/[groupId]/page.tsx` | 0c, Home | Built, status lines are placeholders |
| `/groups/<id>/invite` | `groups/[groupId]/invite/page.tsx`, `invite/CopyLink.tsx` | Invite link and members | Built |
| `/groups/<id>/receipts` | `groups/[groupId]/receipts/page.tsx` | 2, Receipts | Placeholder (step 2) |
| `/groups/<id>/categories` | `groups/[groupId]/categories/page.tsx` | 4, Categories | Placeholder (step 3) |
| `/groups/<id>/balance` | `groups/[groupId]/balance/page.tsx` | 5, Balance | Placeholder, shows period dates (steps 3, 5) |
| `/auth/callback` | `auth/callback/route.ts` | No screen. Where Google sends the user back after sign in. | Built |

Shared screen files:

| File | What it holds |
|---|---|
| `actions.ts` | What happens when a form is submitted: `createGroupAction`, `joinGroupAction`. |
| `layout.tsx` | The frame around every screen: font, phone width, page title. |
| `loading.tsx`, `error.tsx`, `not-found.tsx` | Loading, error with retry, and not found screens. |
| `globals.css` | Colours, font and the Home animations. |

## src/app/api: API for other applications

Full detail in [API.md](API.md). Each file is a thin wrapper that calls a service.

| Address | File | Does |
|---|---|---|
| `GET /api/v1/health` | `api/v1/health/route.ts` | App and database status |
| `GET /api/v1/me` | `api/v1/me/route.ts` | Signed in user and their groups |
| `GET, POST /api/v1/groups` | `api/v1/groups/route.ts` | List and create groups |
| `GET /api/v1/groups/<id>` | `api/v1/groups/[groupId]/route.ts` | One group, members only |
| `GET /api/v1/invites/<code>` | `api/v1/invites/[token]/route.ts` | What is behind an invite link |
| `POST /api/v1/invites/<code>/join` | `api/v1/invites/[token]/join/route.ts` | Join by invite link |
| `GET /api/cron/keep-alive` | `api/cron/keep-alive/route.ts` | Daily keep alive, Vercel only |

## src/components: shared pieces of screen

| File | What it holds |
|---|---|
| `TabScreen.tsx` | Layout for the first screen of each tab. |
| `TabBar.tsx` | Bottom tab bar: Receipts, Categories, Balance. |
| `DistillMark.tsx` | The Distill wordmark, also the link back to Home. |
| `Icon.tsx` | Line icons. |
| `Figures.tsx` | Animated stick figures on Home. |

## tests

| Folder | What it holds |
|---|---|
| `tests/unit` | One test file per file in `src/domain`: `money.test.ts`, `ledgers.test.ts`, `groups.test.ts`. |
| `tests/e2e` | `auth.spec.ts`: Sign in screen, redirect to sign in, sign in error. Signed in flows are checked by hand for now. |
| `tests/fixtures` | Empty. Will hold sample receipts and fake reading results from step 2. |
