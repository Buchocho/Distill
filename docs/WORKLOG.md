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
