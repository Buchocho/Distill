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

## 2026-11-05: code comments and code map

- Goal: make the code readable for Maduabuchi and the marker without changing what it does, and make build progress traceable rule by rule.
- Prompt: comment all code so a person can read what each function is, what it does and the business logic behind it; keep a guideline document mapping what is in each file and where each function lives.
- Changed: a header comment on every source file and a comment on every exported function, naming the SPEC.md rules and stories it serves. New docs/CODE_MAP.md (every file, its main functions, screen status) and docs/BUSINESS_RULES.md (each SPEC.md rule with status and the files that enforce it). CLAUDE.md gains a "Comments and code documentation" section so later sessions keep both documents current. Migration files were not edited.
- Verified: every changed code file was compiled with comments removed and compared with the previous version; no code changed. Type check, lint and unit tests run after the change.
- Found while reviewing, left open: changing the display name (rule 1) and changing the close rule (rule 18) are not built, although the New group screen says "You can change it later"; dates are worked out in UTC, which is one hour behind Portugal in summer.

## 2026-11-06: step 1 changes: display name dropped, group currency, local dates, tax rule

- Goal: close the open points from 5 Nov before the hand check of step 1.
- Decisions by Maduabuchi: changing the display name is dropped from v1 (roadmap); the Google name is used. A group chooses a currency when created (display only, no conversion), from every currency with two decimal places, because the app will be sent to people in the US, Canada and Nigeria. Dates follow the local date of the device doing the action, with no stored time zone. Tax printed as its own line is an item (step 2).
- Prompts: "Drop it from v1, replace it with the ability to select a currency for a group"; "Add all the currencies that are 2 decimal places"; "tax should be a new item"; "Use the local time of the device scanning to keep things simple".
- Changed: SPEC.md rules 1, 2b, 2c, 6 and the roadmap. New `src/domain/currencies.ts` (119 currencies). `money.ts` gains `formatMoney` and formats by currency without floating point. `groups.currency` column (migration 0003) with a format check. New group form has a Currency field and sends the device date in a hidden field; the API accepts `currency` and `localDate`. The first period now starts on the creator's local date instead of the UTC date.
- Left out on purpose: currencies shown with no or three decimals (for example yen, CFA franc, Kuwaiti dinar) and withdrawn ones. A group's currency cannot be changed after creation (decided by Maduabuchi), so no edit is planned.
- Verified: type check, lint, unit tests (new tests for the currency list, formatting and the device date check), production build. Not verifiable here: the migration on Supabase and the form on the deployed app; checked in the step 1 hand check.

## 2026-11-07: step 1 closed (tentative), step 2 built: scan, read, review and save

- Step 1 hand check by Maduabuchi: sign in, group creation with the currency choice and the earlier flows work. Called a tentative pass. Joining from a second account is not tested yet (only one Google account); to be checked when his brother joins, before the demo.
- Setup done by Maduabuchi: private bucket `receipt-photos` (10 MB limit, raised from 5 MB after he raised the size of camera photos; JPEG, PNG, WebP; no policies). New Gemini API key in Vercel.
- Model: he chose Gemini 2.5 Flash. A test from his computer gave 404 for gemini-2.5-flash and gemini-2.5-flash-lite and success for gemini-3.5-flash-lite, so `GEMINI_MODEL` is gemini-3.5-flash-lite (set in Vercel by Claude with his approval). One model for now; move up if readings are poor.
- Prompts: "Use Flash 2.5"; "What about Gemini 2.5 flash-lite"; "I'm worried about this: Restrict file upload size"; "Please go ahead and set Gemini 3.5 flash lite in Vercel. Let's make progress."
- Built: Receipts screen (take a photo, choose a file, paid by, recent receipts with status); photo shrunk in the browser and uploaded with a one time link; reading through Gemini with the group's category names; review screen (edit store, date, total, paid by, names and prices; choose, propose or skip categories; sum check); save (creates proposed categories and logs them); failed reading with Retry; saved receipt view; live Receipts line on Home. API routes for each action. Migration 0004 adds `items.proposed_category`.
- Verified here: type check, lint, 46 unit tests (new: reading checks with two sample answers, amounts in both styles, sum check, category matching, save checks), 5 end to end tests (signed out only), production build. Not verifiable here: upload, Gemini reading and saving, because this environment cannot reach Supabase or Gemini. Checked by hand on the deployed app next.
- Left open: changing items after saving, item change log and sharing rules (step 3); more photos per receipt (step 4); whether 2500 px is enough for long receipts.

## 2026-11-09: step 2 fixes from Maduabuchi's testing

- Goal: fix the issues he listed while testing the receipt screens on his phone (7 and 9 Nov). Each fix was agreed one by one before any code was changed; the review layout was agreed as a mockup first ("Review receipt v3" on the Distill screens canvas, approved 9 Nov).
- Prompts: "you are treating a discount as an individual expense"; "there needs to be a delete photo"; "See photo ... error page"; "the app is giving me details like soft drinks, when it is nectar laranja"; "the date ... needs to go up to the top of the tile ... prices bigger ... drop down more aesthetically pleasing"; "we need to be able to change the name"; "I approve of the new mockup ... proceed with executing the other changes".
- Changed:
  1. Discounts: each item has a price paid (summed and split) and a discount (information only), whichever way the shop prints it. Whole-receipt vouchers stay a negative line; proper handling moved to the roadmap. Migration 0005 adds `items.discount_cents`. SPEC rule 6.
  2. Delete: an unsaved receipt can be deleted with its photo after an in-app confirm, from the review and "couldn't read" screens. Saved receipts cannot. SPEC rule 9b.
  3. Photo link: "See photo" now goes through `/api/v1/receipts/<id>/photos/1`, which makes a fresh link on every tap. Cause of the error: links were made when the page loaded and expired after 10 minutes.
  4. Categories: Gemini is told to use product types (Orange juice, Cola), never shop aisles (Soft drinks) or brands. SPEC rule 7.
  5. Review layout rebuilt to mockup v3: date at the top of the card, larger store and total, item name on its own line, a full width category dropdown beside the price, prices larger with the currency symbol, discount under the price, Delete beside Save.
  6. Missing store and item names: cause found. The name fields and price fields shared a full width style that overrode the price field's fixed width, so the price field took the whole row and the name field shrank to nothing. Fixed in the new layout; checked by rendering the form in a browser at 390 px.
  7. Display name: restored to v1. "Your name in Distill" on the members screen; pages and API now use the stored name, not the Google name. SPEC rule 1.
- Verified: type check, lint, 49 unit tests, end to end tests (signed out), production build, and a browser render of the new review form and its delete confirm with sample data. Not verifiable here: real reading, upload, delete and name change against Supabase and Gemini; checked by hand next.
- Left open: whether the new category instructions give the right level on real receipts; whole-receipt discounts (roadmap).

