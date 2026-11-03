# Work log

One entry per build session. Evidence for the "LLM good practices" criterion.

## 2026-10-25: pre-build documents

- Goal: define stack, architecture, folder structure, data model, SPEC.md and CLAUDE.md before the first build prompt.
- Inputs: approved Assignment 1 specification, Assignment 2 brief, multi photo receipt feature spec.
- Output: docs/ARCHITECTURE.md, docs/DATA_MODEL.md, SPEC.md, CLAUDE.md, docs/features/multi-photo-receipt.md.
- Verification: reviewed by Maduabuchi before step 0 starts.
- Open: questions in SPEC.md section 9.

## 2026-10-25: hosting decision

- Considered: FEUP server with PHP and FEUP PostgreSQL; Vercel with the FEUP database; Vercel with Supabase.
- Decided: Next.js on Vercel with Supabase (Postgres, Google sign in, photo storage). Faster to build and not dependent on a teacher created account or FEUP network access.
- Risk: a free Supabase project pauses after a period of inactivity. Mitigation: a daily keep alive job on Vercel (step 0), plus regular real use of the app.
- Keep alive is done when: the job runs once a day, runs one small query, is protected by CRON_SECRET, and a successful run is visible in the Vercel logs.

## 2026-11-01: step 0, project setup

- Goal: repo, schema for all tables, migrations, keep alive job, empty app ready for Vercel.
- Changed: Next.js 15 app (TypeScript, Tailwind) scaffolded; Drizzle schema for the 12 tables in docs/DATA_MODEL.md; migration 0000 creates them, migration 0001 enables Row Level Security on all of them; `vercel-build` runs migrations before each deploy; `/api/v1/health`; daily keep alive at `/api/cron/keep-alive` protected by CRON_SECRET; `splitCents` (largest remainder) and `formatCents` with unit tests; Playwright set up at phone viewport.
- Data model changes found while writing the schema: receipt status gains `draft` and `saved`, plus `saved_at`, to enforce that photos lock once a receipt is saved; `categories.created_by` is not null; `payments.created_at` added.
- Verified here: type check passed, lint passed, 9 unit tests passed, 1 end to end test passed, production build passed.
- Not yet verified: migrations against Supabase, health check and keep alive on Vercel. This environment cannot reach Supabase, so these are checked after the first Vercel deploy.

## 2026-11-01: hosting stays on Vercel

- Netlify was tried and reverted. Its free plan allows about 20 production deploys a month (300 credits, 15 per deploy), too few for an active build. Vercel's free tier has no such limit.

## 2026-11-01: step 0 verified on Vercel

- Deployed at https://distill-ma7f.vercel.app.
- Verified by Maduabuchi: `/api/v1/health` returns status ok (the app reaches the database); Supabase shows the 12 tables, so the migrations ran during the Vercel build.
- Still to verify: the first keep alive run (daily at 06:17 UTC) in the Vercel logs.

## 2026-11-01: Google sign in in testing mode

- Google sign in stays in testing mode for now: only listed test users can sign in. Publishing needs a privacy policy and terms page.
- Before submission (step 7): add a privacy page and publish the Google consent screen, so anyone can sign in.

## 2026-11-01: UI design and approval added to the plan

- Gap found by Maduabuchi: the plan had no point where he approves the UI; the design review was only in step 7.
- Added: step 0b, a design stage (look and key screen mockups) approved before any screen is built; every step now ends with his screen approval and an LLM design check.

## 2026-11-02: category rule changes

- Decided with Maduabuchi: a category with no rule is not split; its items count as unsorted and the period cannot be agreed until every category used in it has a rule. The person who saved the receipt that created the category is prompted; any member can set the rule. Category creation and rule changes are logged and visible to all members (screen 4c). Considered and rejected: the creator paying 100% until a rule is set, because the creator is usually the main shopper and the pressure would miss the members who never scan.
- Changed: SPEC.md rules 12, 14a, 17, 20, 21, screen 4c and section 7; DATA_MODEL.md and schema gain `category_changes`; migration 0002 creates it with Row Level Security.

## 2026-11-03: UI design, step 0b

- Design canvas "Distill screens" holds all screens as a clickable prototype: loading, sign in, join, new group, home, receipts, receipt photos, review, categories, sharing rule, category history, balance (open period), closed period, payments, record a payment.
- Look: AtheriaHQ ink, paper and orange, warm greys, Open Sans; colours with one meaning each (orange act here, grey waiting, green done, red error).
- Decided with Maduabuchi: Home is a landing page outside the tabs with three sections (Receipts, Categories, Balance), dark to light, with drawn stick figures and motion; tab screens get a Home link at the top right; per person section order goes on the roadmap.

## 2026-11-03: design approved, step 1 starts

- Design approved: canvas "Distill screens", page v2. Each tab keeps its Home colour through its whole journey (Receipts dark, Categories orange, Balance white). Home shows no amounts; the Balance section says "The group's balance" with a Check balance button.
- Confirmed and added to SPEC.md: rules 3a (first sign in with no group goes to /start), 13a (rule changes apply to the open period only), 17a (Balance tab opens the open period; a closed period needing agreement shows as one card).
- Schedule: setup and design ran about two days over plan. The final week is now about three days.

## 2026-11-03: step 1, sign in and groups (built, not yet checked by hand)

- Built: Google sign in through Supabase (`/login`, `/auth/callback`, session middleware); user row created on first sign in; `/start` for users with no group; `/groups/new` with validation; invite page with share and copy; `/join/[token]`; Home in the v2 design with the three animated sections; tab screens in their colours with placeholder content; Distill mark returns to Home; loading, error and not found screens.
- API: `/me`, `/groups`, `/groups/{id}`, `/invites/{token}`, `/invites/{token}/join`, documented in docs/API.md. Accepts a bearer token so other applications can call it.
- Domain: `ledgers.ts` (close dates, first and next ledger, plain descriptions) and `groups.ts` (validation), with unit tests.
- Design change: the New group screen no longer shows an "Invite by link" button. The invite link exists only after the group is created, so the app shows it on the next screen.
- Verified here: type check, lint, 21 unit tests, 3 end to end tests (signed out flows), production build. Not verifiable here: sign in, database writes and joining, because this environment cannot reach Supabase or Google. Checked by hand on the deployed app next.
