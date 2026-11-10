# Distill: code map

Author: Maduabuchi Ogugua Dibiaezue
Last updated: 10 Nov 2026, build step 5 (closing periods, sorting leftovers, agreeing, close date setting).

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
| Which currencies a group can choose | `src/domain/currencies.ts` |
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
| `money.ts` | Splitting and showing money | `splitCents` splits an amount between people so the parts add up exactly. `formatCents` shows cents in the currency's number style (12,90 for euro, 12.90 for others). `formatMoney` adds the symbol (12,90 €, $12.90). `parseAmount` turns typed or printed amounts (12,90 or 12.90) into cents. `currencyAffix` says whether the symbol goes before or after an amount. `FULL_SHARE_BP` is 100% (10000). | 2b, 8, 11, 15 |
| `currencies.ts` | Currencies a group can choose | `CURRENCIES` lists every two decimal currency. `isSupportedCurrency` checks a code. `DEFAULT_CURRENCY` is EUR. | 2b |
| `ledgers.ts` | Period dates | `validateCloseSetting` checks a close choice. `nextCloseDate` finds the next close date. `firstLedger` and `nextLedger` give a period's start and end. `describeClose` gives the sentence shown on Join. `daysUntil` gives the days left. | 18, 19 |
| `receipts.ts` | Receipt rules | `parseReading` checks Gemini's answer and turns prices into cents. `sumCheck` gives the items total and the difference from the printed total. `matchCategory` matches a read category to the group's list or keeps it as a proposal. `validateReview` checks a receipt before saving. `receiptStatus` gives the status shown in the list. `storeKey` and `receiptNumberKey` make names and numbers comparable; `findDuplicate` finds a saved receipt with the same store and number (block) or the same store, date and total (warning, even if numbers differ). | 6, 7, 8, 9, 9c, 10, US2, US5 |
| `rules.ts` | Sharing rules | `validateRule` checks a rule (shares total 100%). `describeRule` gives "Everyone equal", "Whoever paid", "Izu 70%, Butch 30%". `weightsFor` says who carries an item. `percentToBp`, `bpToPercent`, `equalShares`. | 11, 12, 13 |
| `balance.ts` | Who owes whom | `computeBalance` splits every ruled item by its rule in cents, nets each pair to one line, and counts left out items. `netFor` gives one person's position. | 15, 16, 17 |
| `periods.ts` | Period stages and closing | `periodStage` (open, closed, agreed, settled). `periodForToday` gives the period that should be open. `agreeBlockedBy` says why Agree is closed. | 18, 19, 21, 22a |
| `dates.ts` | Date style and checks, shared by server and browser | `longDate` gives 28 Sep 2026. `dateLooksWrong` flags a future date or one over 60 days old. `deviceToday` is the phone's date. | 2c, 6, 8 |
| `users.ts` | Display name check | `checkDisplayName` cleans a chosen name or gives an error. `DISPLAY_NAME_MAX` is 30. | 1 |
| `groups.ts` | New group form check, device date | `validateNewGroup` returns a message per field (name, close, currency), or none when valid. `isValidLocalDate` checks the date sent by the device. `utcToday` is the fallback date. | 2b, 2c, 18, US1 |

## src/server: data and sign in

| File | What it holds | Main functions |
|---|---|---|
| `services/groups.ts` | Groups, members, invites | `listMyGroups`, `createGroup` (group with its currency, first member and first period starting on the device's date, in one step), `getGroupForMember` (members only), `assertMember` and `isMember` (the membership check every service uses), `getInvite`, `joinByToken`. |
| `services/receipts.ts` | Receipts, photos and items | `listReceipts`, `startReceipt` (receipt in the open period plus a one time upload link), `readReceipt` (Gemini reading, or status failed for Retry), `getReceipt` (everything the review screen needs), `photoLink` (a fresh photo link on each tap), `saveReceipt` (creates proposed categories, saves items, locks the receipt), `deleteReceipt` (unsaved only, with its photos). |
| `integrations/gemini.ts` | Receipt reading | `readReceiptPhotos` sends photos and the group's category names to the model in `GEMINI_MODEL`, returns its JSON answer unchecked. |
| `integrations/storage.ts` | Photo storage | `createUploadLink`, `downloadPhoto`, `viewLink` (10 minutes), `deletePhotos`, `photoPath`. Uses the service key, server only. |
| `services/users.ts` | The app's record of each person | `ensureUser` creates the user's row on first sign in and never overwrites a chosen name. `setDisplayName` changes the name shown. |
| `services/categories.ts` | Categories, rules, history, item category changes | `listCategories`, `getCategory`, `setRule` (logged), `createCategory`, `categoryHistory`, `listToSort`, `changeItemCategory` (open period, or unsorted items in a closed period; logged), `deleteItem` (payer only, closed period), `clearOpenAgreements`, `itemHistory`, `countToSort`, `rulesForGroup`, `openPeriodItems`, `ledgerItems`. |
| `services/periodClock.ts` | Closing on time | `requestToday` (device date from the `distill_today` cookie, else UTC), `ensurePeriods` closes an ended period and opens the next; called by `getGroupForMember` and `startReceipt`. |
| `services/periods.ts` | Closed periods and agreeing | `listClosedPeriods`, `getPeriod`, `agree` (freezes amounts when the last member agrees), `setCloseRule`. |
| `services/balance.ts` | Open period balance | `getOpenBalance` works out the balance from current items and rules. |
| `services/system.ts` | Health and keep alive | `keepAlive` stops the free Supabase project from pausing. `databaseIsUp` for the health check. |
| `services/errors.ts` | Expected failures | `ServiceError` (invalid, not found, not signed in, forbidden) and `STATUS`, the HTTP code for each. |
| `auth.ts` | Who is signed in | `currentUser` for pages, `apiUser` for the API (cookie or bearer token). |
| `session.ts` | Sign in guard for pages | `requireUser` sends signed out users to Sign in and back afterwards. |
| `pageData.ts` | Shared page loading | `groupOr404` loads a group or shows Not found. |
| `api.ts` | Shared API behaviour | `withUser` (sign in required, same error format everywhere), `readJson`. |
| `db/client.ts` | The database connection | `db`, used only by services. |
| `db/schema.ts` | All 12 tables | One definition per table, with the database level checks that protect business rules. |
| `db/migrations/` | Database changes in order | `0000_init.sql` creates all tables. `0001_enable_rls.sql` blocks the browser from reading tables directly. `0002_category_changes.sql` adds the category history table. `0003_group_currency.sql` adds the group currency. `0004_item_proposed_category.sql` adds the proposed category on items. `0005_item_discount.sql` adds the item discount. `0006_receipt_number.sql` adds the receipt number. `0007_category_rule_kind.sql` adds the rule kind on categories. `0008_period_stages.sql` adds the agreement freeze and settled fields on ledgers and `deleted_at` on items. Generated by the tool; once applied they are never edited. |

Planned, not yet created: `services/receipts.ts`, `services/categories.ts`, `services/ledgers.ts`, `services/payments.ts`, `integrations/gemini.ts`, `integrations/storage.ts`, and in `src/domain`: `split.ts`, `balance.ts`, `agreement.ts` (ARCHITECTURE.md section 4).

## src/lib and src/middleware.ts

| File | What it holds |
|---|---|
| `lib/supabase/browser.ts` | Supabase connection in the browser, for sign in and signed photo uploads. |
| `lib/photos.ts` | `preparePhoto` shrinks a photo to 2500 px and JPEG before upload; `PHOTO_BUCKET`, `PHOTO_MAX_BYTES` (10 MB). |
| `lib/supabase/server.ts` | Supabase connection on the server, to read the sign in session. |
| `middleware.ts` | Runs before every page and keeps the sign in session fresh. |

## src/app: screens

Screen numbers match SPEC.md section 5.

| Route | File | Screen | Status |
|---|---|---|---|
| `/` | `page.tsx` | No screen. Sends the user to Sign in, Start or Home. | Built |
| `/login` | `login/page.tsx`, `login/SignInButton.tsx` | 0, Sign in with Google | Built |
| `/start` | `start/page.tsx` | 0a, Start: create a group or use an invite link | Built |
| `/join/<code>` | `join/[token]/page.tsx` | 0b, Join a group | Built |
| `/groups/new` | `groups/new/page.tsx`, `groups/new/NewGroupForm.tsx` | 1, New group | Built |
| `/groups/<id>` | `groups/[groupId]/page.tsx` | 0c, Home | Built. Receipts and Categories status lines are live |
| `/groups/<id>/invite` | `groups/[groupId]/invite/page.tsx`, `invite/CopyLink.tsx`, `invite/DisplayNameForm.tsx`, `invite/CloseRuleForm.tsx` | Invite link, members, "Your name in Distill", "Accounts close" | Built |
| `/groups/<id>/receipts` | `groups/[groupId]/receipts/page.tsx`, `receipts/ScanPanel.tsx` | 2, Receipts: take a photo or choose a file, paid by, recent receipts with status | Built (one photo per receipt; more in step 4) |
| `/groups/<id>/receipts/<receiptId>` | `receipts/[receiptId]/page.tsx`, `ReadingStep.tsx`, `ReviewForm.tsx`, `DeleteReceipt.tsx` | 3, Review receipt: reading, Retry, review and save (layout from mockup v3), delete before saving, saved view | Built. On a saved receipt any member can change an item's category; changes shown under the item |
| `/groups/<id>/categories` | `groups/[groupId]/categories/page.tsx`, `categories/AddCategory.tsx` | 4, Categories: needs sorting flag, categories with rules, History, Add category | Built |
| `/groups/<id>/categories/<categoryId>` | `categories/[categoryId]/page.tsx`, `RuleForm.tsx` | 4b, Sharing rule: Everyone equal, Whoever paid, One person, Custom | Built |
| `/groups/<id>/categories/history` | `categories/history/page.tsx` | 4c, Category history | Built |
| `/groups/<id>/categories/sort` | `categories/sort/page.tsx` | Needs sorting: items without a category, categories without a rule | Built |
| `/groups/<id>/balance` | `groups/[groupId]/balance/page.tsx` | 5, Balance: your position, who owes whom, left out items, a card per closed period | Built; Payments in step 6 |
| `/groups/<id>/balance/<ledgerId>` | `balance/[ledgerId]/page.tsx`, `AgreeButton.tsx` | 5, Close the period: leftovers, amounts, who agreed, Agree | Built |
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
| `GET, PATCH /api/v1/me` | `api/v1/me/route.ts` | Signed in user and their groups; change display name |
| `GET, POST /api/v1/groups` | `api/v1/groups/route.ts` | List and create groups |
| `GET /api/v1/groups/<id>` | `api/v1/groups/[groupId]/route.ts` | One group, members only |
| `GET /api/v1/invites/<code>` | `api/v1/invites/[token]/route.ts` | What is behind an invite link |
| `POST /api/v1/invites/<code>/join` | `api/v1/invites/[token]/join/route.ts` | Join by invite link |
| `GET, POST /api/v1/groups/<id>/receipts` | `api/v1/groups/[groupId]/receipts/route.ts` | List receipts, start a receipt |
| `GET, DELETE /api/v1/receipts/<id>` | `api/v1/receipts/[receiptId]/route.ts` | One receipt for review; delete before saving |
| `GET /api/v1/receipts/<id>/photos/<n>` | `api/v1/receipts/[receiptId]/photos/[position]/route.ts` | Fresh link to a photo |
| `POST /api/v1/receipts/<id>/read` | `api/v1/receipts/[receiptId]/read/route.ts` | Read or retry |
| `POST /api/v1/receipts/<id>/save` | `api/v1/receipts/[receiptId]/save/route.ts` | Save a reviewed receipt |
| `GET, POST /api/v1/groups/<id>/categories` | `api/v1/groups/[groupId]/categories/route.ts` | List and add categories |
| `GET /api/v1/groups/<id>/categories/history` | `.../categories/history/route.ts` | Category history |
| `GET /api/v1/groups/<id>/to-sort` | `api/v1/groups/[groupId]/to-sort/route.ts` | What needs sorting |
| `GET /api/v1/groups/<id>/balance` | `api/v1/groups/[groupId]/balance/route.ts` | Open period balance |
| `GET /api/v1/categories/<id>` | `api/v1/categories/[categoryId]/route.ts` | One category |
| `PUT /api/v1/categories/<id>/rule` | `api/v1/categories/[categoryId]/rule/route.ts` | Set a rule |
| `PATCH /api/v1/items/<id>` | `api/v1/items/[itemId]/route.ts` | Change a saved item's category |
| `PATCH /api/v1/groups/<id>` | `api/v1/groups/[groupId]/route.ts` | Change the close date |
| `GET /api/v1/groups/<id>/periods` | `api/v1/groups/[groupId]/periods/route.ts` | Closed periods |
| `GET /api/v1/periods/<id>` | `api/v1/periods/[ledgerId]/route.ts` | One period |
| `POST /api/v1/periods/<id>/agree` | `api/v1/periods/[ledgerId]/agree/route.ts` | Agree |
| `GET /api/cron/keep-alive` | `api/cron/keep-alive/route.ts` | Daily keep alive, Vercel only |

## src/components: shared pieces of screen

| File | What it holds |
|---|---|
| `TabScreen.tsx` | Layout for the first screen of each tab. |
| `SubScreen.tsx` | Layout for an inner screen: Back, title, tab colour. |
| `ItemCategoryPicker.tsx` | Change a saved item's category, dark or light. |
| `RemoveItem.tsx` | Remove a leftover item from a closed period, with an in-app confirm. |
| `DeviceDate.tsx` | Puts the device's date in a cookie on every page (rule 2c). |
| `TabBar.tsx` | Bottom tab bar: Receipts, Categories, Balance. |
| `DistillMark.tsx` | The Distill wordmark, also the link back to Home. |
| `Icon.tsx` | Line icons. |
| `Figures.tsx` | Animated stick figures on Home. |

## tests

| Folder | What it holds |
|---|---|
| `tests/unit` | One test file per file in `src/domain`: `money.test.ts`, `ledgers.test.ts`, `groups.test.ts`, `currencies.test.ts`, `receipts.test.ts`, `users.test.ts`, `dates.test.ts`, `rules.test.ts`, `balance.test.ts`, `periods.test.ts`. |
| `tests/e2e` | `auth.spec.ts`: Sign in screen, redirect to sign in, sign in error. `receipts.spec.ts`: receipt, category and balance API and screens refuse signed out users. Signed in flows are checked by hand for now. |
| `tests/fixtures` | Sample Gemini answers: `reading-continente.json` (clean Portuguese receipt), `reading-us-tax-discount.json` (sales tax, a discount, broken lines, a false date). |
