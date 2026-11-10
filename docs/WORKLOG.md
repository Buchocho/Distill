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

## 2026-11-09 (evening): second round of step 2 fixes

- His test results on the first round: name change, delete, discount, photo link passed; layout good. Failed or new: opening a saved receipt showed "Something went wrong"; See photo did not look clickable; leaving an item unsorted meant picking "Choose a category"; an Intermarché date printed year first (26/10/18) was read as 26 Oct; duplicate receipts could be saved. The Categories tab saying "No categories yet" is expected: it is the step 3 screen.
- Decisions: block a duplicate only on the same store and receipt number (a number is unique per shop, not across shops); warn, not block, on the same store, date and total, because two genuine identical shops happen and there is no manual entry to recover a wrongly blocked receipt. He asked whether to block all duplicates and then chose this. Duplicate warning moved from the roadmap into v1 (rule 9c).
- Prompts: "#4 Failed ... #5 ... #7 ... more intuitive way"; "the date was structured as 26/10/18"; "the app is accepting and saving duplicate receipts"; "should we block duplicate receipts"; "can't we track the receipts by their ID"; "Yes".
- Changed: date formatting moved from a browser only file into `src/domain/dates.ts` (cause of the saved receipt error, seen 10 times in the Vercel logs); See photo underlined; "Leave unsorted" option in the category dropdown with a dashed grey state, "Skip for now" link removed; Gemini told today's date and that some shops print year first; "Check the date" shown for a future date or one over 60 days old; receipt number read, stored (migration 0006), shown and editable; duplicate banner on review (block or warning, "Save anyway"), and the block enforced again on save.
- Verified: type check, lint, 58 unit tests, end to end tests, build, and a browser render of the warning, the unsorted state and the underlined link with sample data. Not verifiable here: real readings of dates and receipt numbers.
- Left open: how reliably Gemini reads receipt numbers on real receipts.

## 2026-11-09 (late): duplicate check missed a receipt

- Found by Maduabuchi: a Continente receipt saved, then scanned again, could be saved a second time with no block or warning. The saved copy had number FS AMM004/514739; the new scan read FS AMW004/514739 (one letter misread).
- Cause: the block worked as written (the numbers differ). The logic error was that the store, date and total warning ran only when one receipt had no number, so two different numbers were taken to mean two different receipts.
- Changed (he asked for the trace plus the store, date and total check "in case a cropped receipt is added"): the warning now runs whenever store, date and total match, whatever the numbers say; store names are compared without accents, capitals or punctuation (`storeKey`). SPEC rule 9c updated.
- Verified: type check, lint, 60 unit tests (new: the AMM/AMW case, accents), end to end tests, build.
- Test fix: the sign in error end to end test was flaky (failed 1 run in 3): Next.js sometimes adds its own role="alert" announcer, so the test now picks the alert by its text. Passed 3 runs in a row after the fix.
- Left open: misread letters in receipt numbers cannot be prevented by instructions; the warning is the safety net.

## 2026-11-09: step 2 passed

- Hand check by Maduabuchi on the deployed app, all passed: scan and read, review layout (mockup v3), item discounts, delete before saving, See photo, categories at product type level, Leave unsorted, dates, display name, duplicate block and warning (including the misread number case). His brother has joined the group by invite link, which closes the open step 1 check.
- Design: the "Review receipt v3" artboard on the Distill screens canvas was updated to match what was built (Leave unsorted, receipt number, underlined See photo) and renamed "approved, built".
- Deferred by his decision: a receipt stuck in "reading" (a reading cut off by the 60 second limit or a lost connection) cannot be retried or deleted from the screen; rare, to fix later. Long receipts at 2500 px are untested (no long receipt to hand); step 4 (several photos) addresses them.
- Known gap: signed in flows have no automated end to end tests because tests cannot sign in with Google; covered by his hand checks.

## 2026-11-09 (night): scan for yourself, and step 3 built: sharing rules, item changes, open period balance

- Decisions by Maduabuchi before building:
  - After saving, only an item's category can change; name and price are fixed, as protection against a member changing what someone else bought.
  - A member scans only their own receipts; the payer is always the person scanning (SPEC rule 4 changed). Pros and cons were discussed: it removes wrong or dishonest "paid by" and makes "Whoever paid" safe; it changes the approved spec and is a weaker fit for the low-effort persona, who must now scan their own receipts. Workaround for a receipt in the wrong pocket: send the photo to the payer to upload.
  - A rule kind he asked for: "Whoever paid" (each person pays for their own chocolate bars), so rules are Everyone equal, Whoever paid, One person, Custom. Shortcuts accepted.
  - One "needs sorting" flag, shown only when at least one item is unsorted or in a category without a rule, not one per item.
- Prompts: "What does Step 3 involve?"; "flag uncategorized items ... just have a tab whenever there is at least one"; "whoever bought it pays for it"; "only change the category"; "you can only scan ... for that person"; "Yes, proceed".
- Built: scan for yourself (Paid by removed; only the scanner reviews, saves or deletes an unsaved receipt; others see "still adding"); rule kinds (migration 0007, `categories.rule_kind`); Categories tab with the needs sorting flag, rules in words, History, Add category; Sharing rule screen with the four options, Split evenly and the 100% check; Category history; Needs sorting screen; changing a saved item's category with its history shown under the item; Balance tab with your position, netted lines and left out items; live Categories line on Home. API routes for each.
- Verified: type check, lint, 76 unit tests (new: rules and balance, including Whoever paid moving no money, netting, vouchers, left out items), end to end tests (signed out), build, and a browser render of the rule form. Not verifiable here: the screens against real data; checked by hand next.
- Left open: closing a period and Agree (step 5), payments (step 6). The stuck "reading" fix stays deferred.

## 2026-11-10: step 3 passed

- Hand check by Maduabuchi, with his brother, on the deployed app: rules (Everyone equal, Whoever paid), the needs sorting flag and Sort screen, the balance from both members' receipts with netting, changing a saved item's category with its history, category History, and another member seeing "still adding" on an unsaved receipt. All seven passed; he called it a pass "for now".

## 2026-11-10: step 5 built: closing periods, sorting leftovers, agreeing

- Order: Step 4 (several photos per receipt) moved after steps 5 to 7, to be built only if time is left; long receipts are rare and he has none to test with.
- Decisions: two stage settling, his idea: while a closed period is not yet agreed by all, its amounts follow the current rules and any change clears agreements; when the last member agrees the amounts are frozen (stage 1); when everything is confirmed paid the period is settled and read only (stage 2, step 6). Weak point accepted: before everyone agrees, a rule change made for the new period also moves the closed one (and clears its agreements). Assumptions he accepted: only the payer can remove a leftover item, logged; closing uses the device's date; the close date can be changed on the members screen.
- Prompts: "let's move on to step 5"; "we can freeze partially on one and more completely on the second"; "Yes".
- Built: period closing on group load with the device's date (cookie set by `DeviceDate`), skipping unused periods; closed period screen with leftovers (sort, or remove by payer), categories without a rule, amounts, who agreed, and Agree (closed while anything is left to sort); freeze on the last agreement; agreements cleared by rule changes, sorting and removing; Balance cards per closed period; "Accounts close" setting on the members screen; saved receipts follow the period stage (only unsorted items can change once closed, nothing once agreed; removed items struck through). Migration 0008.
- Verified: type check, lint, 83 unit tests (new: period stages, period for today, Agree check), end to end tests (signed out), build. Not verifiable here: a real period closing; to test by hand, the close date must pass (for example set "Every week" on today's weekday and wait a day, or a day of the month).
- Left open: Home does not yet mention a closed period waiting for agreement.

## 2026-11-10: two fixes found while testing step 5

- Found by Maduabuchi: an item sorted after saving (Needs sorting screen) could only go into an existing category; new categories could only be made while scanning or from the Categories tab. And with more than about 10 categories, Add category was pushed off the bottom of the screen.
- Prompts: "You should be able to create a category when you are trying to assign categories"; "move that button ... to just above the categories".
- Changed: the item dropdown used on the Needs sorting screen, saved receipts and the closed period screen has "New category...", which creates the category (or reuses one with the same name) and moves the item into it; the new category starts with no rule, so it then shows as needing one. Add category moved above the category list, under the needs sorting flag.
- Verified: type check, lint, unit tests, end to end tests, build.

## 2026-11-10: rule screen returned to the wrong place

- Found by Maduabuchi: from Balance, a closed period, "Flour needs a rule", setting Whoever paid and saving went back to Categories instead of the closed period.
- Cause: the rule screen's Save and Back always led to Categories.
- Changed: links to a rule from the closed period screen and from Needs sorting add `?from=` with the page to return to; the rule screen's Back and Save go there (only paths inside the same group are accepted), otherwise to Categories.
- Verified: type check, lint, unit tests, end to end tests, build.

## 2026-11-10: period breakdown and past periods

- Found by Maduabuchi while testing step 5: the closed period asked him to agree to 0,79 € with no way to see where it came from. He asked for a breakdown before agreeing, and a list of every past period on the Balance tab, mockup first.
- Design iterations on the Distill screens canvas: a receipt by receipt version was rejected ("why would somebody want to look at it as receipts"); a category version with paid and share per card was cut down; approved version: per category, the person's share as the large figure, "Bought N times · total", and the split in words ("Split 50/50 with Izu", "Izu pays 100%", "You 20% · Izu 80%", "Each pays for their own · you bought 1 of 3"); purchases and who paid on tap; totals paid, share, owed; a You / Izu switch. His examples drove the wording: a category he buys for Izu shows 0,00 € with "Izu pays 100%". I kept "Each pays for their own" for mixed Whoever paid categories, because "You pay 100%" would be wrong when both bought.
- Prompts: "I need a breakdown page here in balance"; "you've missed the point ... category by category"; "I don't like the you paid and your share"; "That largest figure there should be my share"; "Approved, move on".
- Built: `src/domain/breakdown.ts` (same arithmetic as the balance, tested to reconcile with it); breakdown on the period screen, now also for the open period ("See the breakdown"); Past periods list on Balance with amount and status (Agree, Waiting, Agreed, Settled); rules frozen with the amounts when everyone agrees (migration 0009), so a past breakdown keeps matching.
- Verified: type check, lint, 88 unit tests (new: breakdown shares, ordering, left out items, reconciliation with the balance, split wording from both sides), end to end tests, build, and a browser render of the breakdown with sample data.


## 2026-11-10: step 6, payments (story US9)

- Goal: record payments between members, confirmed by the person paid, and settle a period when everything is paid (stage 2 of settling, rule 22a).
- Decisions by Maduabuchi: payments only once everyone agreed the period; part payments allowed ("No, I want to allow part payments"); a payment can never be more than is left for that pair in that period, counting payments still waiting; while waiting the payer can cancel and the person paid can decline, confirmed payments never change; one payment covers one period. I pushed back on part payments (more states to show and test); he kept them.
- First build followed the approved RecordPayment2 design with one change of mine (pick the amount owed instead of payer, receiver and period). He rejected the whole approach: "I can't really be recording a payment from Rui to me. I can only confirm that payment." Agreed flow: from Balance open the past period, check the breakdown, agree, then on your own line record what you paid, or on money owed to you confirm or decline what was recorded. Only the payer records (SPEC rule 24 changed). Weakness I raised and he accepted: if the payer never records, the person owed cannot mark it paid. He kept rule 26, so the Payments screen stays for waiting payments, history and yearly totals, with no Record button.
- Designs approved on the canvas: AgreedPeriod, AgreedPeriodRecord (form opens under the line), Payments3. The pick list screen was removed.
- Prompts: "What does Step 6 involve?"; "1. Agreed 2. Let's discuss this 3. Agreed 4. Agreed 5. Agreed"; "No, I want to allow part payments"; "I need to see the pick the amount owed form"; "I can only confirm that payment"; "Keep rule 26"; "I approve. Build it."
- Built: `src/domain/payments.ts` (confirmed, waiting and left per amount; the cap check; settled check; year totals); `src/server/services/payments.ts`; API routes (group payments list, period payments list and record, confirm, cancel or decline); on the agreed period: confirmed and left per line, Record a payment on your own debt, Confirm / Decline / Cancel on waiting payments, link to all payments; Payments screen (waiting for you, all payments, confirmed this year per pair); Payments link on Balance with a count to confirm; Settled banner. A period agreed with nothing owed is settled at once. No schema change.
- Verified: type check, lint, 94 unit tests, end to end tests (signed out), build. The signed in flow is for Maduabuchi and Izu to test by hand.
- Left open: Home does not show payments waiting to be confirmed; removed payments leave no record; periods agreed before this change with nothing owed stay Agreed.

## 2026-11-10: Home Balance line, declined payments kept

- Asked by Maduabuchi after step 6: Home's Balance section always said "October closes in 28 days", which people already know. It should say what is waiting, the way the Categories section does, for example "Confirm payment from Izu", and only show the close date when nothing is pressing. And a declined or cancelled payment must not just disappear: the payer has to see it was rejected. He chose to leave periods agreed before today with nothing owed as Agreed.
- Prompts: "home needs to mention payments ... to be confirmed"; "we should only show it's closing 28 days when there are no other pressing issues"; "You need to add it in the log for payment".
- Built: `src/domain/home.ts` (`balanceLine`: confirm a payment from X, Y declined your payment for October, October is closed · agree your amount, Record your payment to Y for October, otherwise the close date; no amounts, as the approved Home design); `balanceSituation` in the payments service; Home uses it, in bold orange when it asks for action, counted with the device's date (Home used the server's date for the close days before, against rule 2c). Payments are no longer deleted when cancelled or declined: migration 0010 adds `removed_at` and `removed_by`; Payments shows "Declined by Izu" or "Cancelled by you" with the amount struck through; the period line shows "Izu declined your payment of 5,00 ... record it again" until the payer records again. No new mockup: the wording sits in the existing Home and period layouts.
- Verified: type check, lint, 98 unit tests (new: Home line priority and wording), end to end tests, build.
- Left open: periods agreed before today with nothing owed stay Agreed (his decision).

## 2026-11-10: settled periods worded in the past

- Found by Maduabuchi after testing payments with Izu (all step 6 tests passed): Past periods showed November as Settled and "You are owed 1,10 €" at the same time. "You can't be saying you are owed and settled at the same time."
- Changed: `positionWords` and `debtWords` in `src/domain/periods.ts` give the past tense once a period is settled: "You were owed", "You owed", "Izu owed you". Used on the Past periods list and on the period screen (big figure and each line). Open, closed and agreed periods keep the present tense.
- Verified: type check, lint, 100 unit tests (new: both tenses), end to end tests, build.

## 2026-11-10: sign out

- Found by Maduabuchi: there was no way to sign out. He suggested the Invite people screen. I agreed with one caveat: the screen is named for inviting, so sign out is not where someone would first look; it is still the right place, because it already holds the person's own settings (their name in Distill) and the avatar on Home opens it.
- Prompt: "we didn't create a way to sign out. I believe we can easily house that in the Invite people page".
- Built: `SignOutButton` at the bottom of Invite people, under Go to Home, with "Signed in with Google as ..." above it; ends the Supabase session in the browser and replaces the page with Sign in. SPEC rule 1a added. No API route: signing out ends the browser session; API callers with a token simply stop sending it.
- Verified: type check, lint, unit tests, end to end tests, build.

## 2026-11-10: close date applies now, periods named by their dates

- Found by Maduabuchi: changing when accounts close only applied from the next period, so he could not close November out on 11 Nov. And with weekly closes several periods end in the same month, so naming every period by its end month ("November") cannot work.
- Agreed after discussion ("Yes to both"): a rule change applies now, the open period ending on the new rule's first close date from today (today counts, never in the past), with no separate one-off date picker; periods are named automatically from their dates, not typed. Weakness I raised: any member can move the close date, again and again (no admin). Mitigation: the setting shows who changed it last and when.
- Built: `endAfterRuleChange` in `src/domain/ledgers.ts`; `setCloseRule` moves the open period's end and records who and when (migration 0011); the Accounts close form shows "This period will now end on 11 Nov 2026" before saving and "Last changed by Izu on 10 Nov 2026". `periodLabel` in `src/domain/periods.ts`: "October" for a whole calendar month, otherwise "4–10 Nov" or "11 Oct – 10 Nov", year added when not this year. Used on Home (header and Balance line), the Balance header, Past periods, the period screen and its breakdown, and Payments. This also fixes monthly periods closing on a day other than the last, which were named by their end month only.
- Verified: type check, lint, 104 unit tests (new: period names, new end after a rule change), end to end tests, build.

## 2026-11-10: choose the Google account at sign in

- Found by Maduabuchi: after signing out, Continue with Google let him straight back in with the same account; he needs to sign out and in with another account at once. He accepted the weakness on close date changes (any member can keep moving it).
- Cause: signing out of Distill does not sign out of Google, and Google reuses the account it remembers.
- Changed: sign in asks Google for its account chooser every time (`prompt=select_account`). Cost: one extra tap at each sign in, which is rare because sessions last. Distill does not sign anyone out of Google itself.
- Verified: type check, lint, unit tests, end to end tests, build. The chooser itself can only be checked by hand.

## 2026-11-10: step 6 passed; step 7 started: Privacy, Terms, stuck readings

- Step 6 (payments, US9) tested by Maduabuchi with Izu: record, part payment, cap, decline, cancel, confirm, settled, yearly totals, Home line. Passed.
- Step 7 order agreed: Privacy page and Google sign in out of testing mode first (the only part that depends on Google), then the stuck reading fix, demo data later with the demo script, then signed in tests, design review and screen check, documents last. Step 4 (several photos) proposed to be dropped.
- Prompts: "build out the Privacy page and other pages required as well as fixing the receipts getting stuck on reading. Leave Demo Data for later."; contact address chosen: his FEUP address.
- Built: public `/privacy` and `/terms` (shared `LegalPage` layout), linked from Sign in; the Sign in page doubles as the home page Google asks for. Privacy names what is kept, Supabase and Vercel in Ireland, Google sign in, receipt photos sent to Google Gemini under its API terms, two cookies, deletion by email, the CNPD. Rule 1b added.
- Stuck readings: a reading that runs past the server's 60 second limit is cut off before it can mark the receipt failed, so it stayed "reading" and the screen waited forever. Now each reading records when it started (migration 0012); a receipt still "reading" 90 seconds later is shown as failed, with Retry, on the receipt and in the Receipts list. Receipts already stuck have no start time and show as failed at once. The reading screen reloads its state when the status changes.
- Not legal advice: the privacy text was written for a student project and should be read by Maduabuchi; whether Google may use photos sent on the free Gemini quota depends on the Gemini API terms for the EEA, so the page points to those terms rather than promising either way.
- Verified: type check, lint, unit tests, end to end tests (new: Privacy and Terms open signed out), build.
