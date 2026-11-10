# Distill: business rules register

Author: Maduabuchi Ogugua Dibiaezue
Last updated: 10 Nov 2026, build step 7 (several groups, sign out, privacy).

Each business rule in SPEC.md section 4, whether it is built, and the files that enforce it. Rule numbers are the SPEC.md numbers, so a code comment that says "SPEC.md rule 15" points to the same row here.

Use it to answer two questions: how far the build has gone, and if a rule changes, which files have to change.

Keep it current: a change that builds or changes a rule updates its row in the same commit (CLAUDE.md). A rule changes in SPEC.md first.

Status: **Built** (works and is tested or checked by hand), **Partly built** (some of it works; the note says what is missing), **Not built** (the step that builds it is given), **Prepared** (only the database table or check exists so far).

## Groups and members

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 1 | Sign in with Google; a person can change the name they are shown as | Built (restored 9 Nov at Maduabuchi's request) | `src/server/auth.ts`, `src/app/login`, `src/server/services/users.ts` (`ensureUser`, `setDisplayName`), `src/domain/users.ts`, `invite/DisplayNameForm.tsx`, `src/server/session.ts` and `src/server/api.ts` (use the stored name) |
| 1a | Sign out on Invite people and on Start, this device only, with the signed in account shown; sign in always asks which Google account | Built | `src/components/SignOutButton.tsx` (Supabase sign out in the browser), `login/SignInButton.tsx` (`prompt=select_account`) |
| 1b | Public Privacy and Terms pages, linked from Sign in | Built | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/components/LegalPage.tsx`, `src/lib/contact.ts` |
| 2 | The creator is a member; anyone with the invite link who signs in joins | Built | `src/server/services/groups.ts` (`createGroup`, `joinByToken`), `src/server/session.ts` (returns to the link after sign in) |
| 2a | Members see each other's name and Google email on Invite people | Built | `getGroupForMember` in `src/server/services/groups.ts`, `invite/page.tsx` |
| 2d | Membership has dates; Split equally covers members on the purchase day; a period's members agree it | Built | `src/domain/members.ts` (`membersOn`, `periodMembers`, `itemDay`, `ruleForDay`, `withMembership`), `sharers` in `src/domain/balance.ts` and `src/domain/breakdown.ts`, `periodBalance` and `agree` in `src/server/services/periods.ts`, `openPeriodItems` in `src/server/services/categories.ts`, `group_members.joined_on` |
| 2e | Leave or remove any time; out of new splits from that day, still settles the past; read only after; rules naming them need redoing | Built | `removeMember`, `assertCurrentMember`, `listMyGroups` in `src/server/services/groups.ts`, `group_members.left_on` and `removed_by`, `invite/MemberActions.tsx`, read only checks in the receipts and categories services |
| 2b | Group currency chosen at creation, cannot be changed, display only, two decimal currencies only | Built for creation and the API. Amounts on screens use it from step 2, through `formatMoney`. | `src/domain/currencies.ts`, `src/domain/money.ts` (`formatMoney`), `src/domain/groups.ts`, `groups_currency_code` in `src/server/db/schema.ts`, `src/app/groups/new/NewGroupForm.tsx` |
| 2c | Dates follow the device's local date | Built for group creation (first period). Receipts send it from step 2; closing uses it from step 5. | `src/domain/groups.ts` (`isValidLocalDate`), `src/app/actions.ts`, `src/app/api/v1/groups/route.ts`, `src/app/groups/new/NewGroupForm.tsx` |
| 3 | Every member has the same rights, no admin | Built (by design: there is no role to check) | `group_members` table in `src/server/db/schema.ts` |
| 3a | No group after sign in goes to Start; otherwise Home | Built | `src/app/page.tsx`, `src/app/start/page.tsx` |
| 3b | Several groups per user: one group opens straight away, two or more are listed on Your groups; the group name on Home switches | Built | `src/app/page.tsx`, `src/app/groups/page.tsx`, `myGroupsOverview` in `src/server/services/groups.ts`, Home header |

## Receipts (build steps 2 and 4)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 4 | A member adds only their own receipts; the payer is the person scanning; only they review, save or delete it before saving | Built (changed 9 Nov from "choose who paid") | `startReceipt`, `assertOwnReceipt` in `src/server/services/receipts.ts`, `receipts/ScanPanel.tsx`, `receipts/[receiptId]/page.tsx` |
| 5 | A receipt belongs to the period open when it is added | Built: the open period at the moment the receipt is started. Moving to the next period on the close date is step 5 | `startReceipt` in `src/server/services/receipts.ts` |
| 6 | Reading returns store, date, total and items; an item's price is after its discount, the discount is information only; vouchers stay a negative line; tax lines are items | Built: reading through Gemini, checked by `parseReading`; `items.discount_cents` holds the discount; tax lines asked for as items in category Tax | `src/server/integrations/gemini.ts`, `src/domain/receipts.ts` (`parseReading`), `src/domain/money.ts` (`parseAmount`) |
| 7 | Items get a category at product type level; new ones are created when the receipt is saved | Built: the level is set in the Gemini instructions (`src/server/integrations/gemini.ts`); matched ignoring capitals, otherwise kept as `items.proposed_category` until save; a new name can also be typed | `src/domain/receipts.ts` (`matchCategory`), `saveReceipt`, `ReviewForm.tsx`, `categories_name_per_group` and `items_one_category` in `src/server/db/schema.ts` |
| 8 | Review shows items total against printed total; names and prices editable | Built | `src/domain/receipts.ts` (`sumCheck`), `ReviewForm.tsx` |
| 9 | Saving is never blocked by unsorted items | Built: Leave unsorted in the category dropdown; unsorted count on Receipts and Home | `src/domain/receipts.ts` (`validateReview`), `saveReceipt`, `ReviewForm.tsx` |
| 9a | Any number of photos; locked once saved | Partly built: one photo per receipt; saved receipts cannot be read or saved again. More photos are step 4 | `src/server/services/receipts.ts`, `src/server/db/schema.ts` |
| 9b | An unsaved receipt can be deleted with its photo; a saved one cannot | Built | `deleteReceipt` in `src/server/services/receipts.ts`, `DeleteReceipt.tsx`, `src/server/integrations/storage.ts` (`deletePhotos`) |
| 9c | Same store and receipt number cannot be saved twice; same store, date and total warns, even with different numbers | Built | `src/domain/receipts.ts` (`findDuplicate`), `saveReceipt` and `savedReceiptsFor` in `src/server/services/receipts.ts`, `ReviewForm.tsx`, `receipts.receipt_number` |
| 10 | A failed reading keeps the receipt with status "failed" for retry; a reading cut off by the time limit shows as failed after 90 seconds | Built: Retry reads the same photo again | `readReceipt`, `getReceipt`, `listReceipts` in `src/server/services/receipts.ts`, `shownStatus` in `src/domain/receipts.ts`, `receipts.reading_started_at`, `ReadingStep.tsx` |

## Sharing (build step 3)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 11 | A category's rule: Everyone equal, Whoever paid, One person, or Custom percentages totalling 100% | Built | `src/domain/rules.ts` (`validateRule`), `categories.rule_kind` and `category_shares`, `setRule` in `src/server/services/categories.ts`, `RuleForm.tsx` |
| 12 | A category with no rule is not split; its items count as needing sorting; one flag shows the count | Built | `src/domain/balance.ts`, `listCategories` and `countToSort` in `src/server/services/categories.ts`, `categories/page.tsx`, `categories/sort/page.tsx`, Home |
| 13 | Any member changes a saved item's category while the period is open; name and price are fixed after saving; items follow their category's rule | Built | `changeItemCategory` in `src/server/services/categories.ts`, `src/components/ItemCategoryPicker.tsx` |
| 13a | A rule change applies to every item in the open period | Built: the balance is worked out from the current rules each time. Closed periods are kept separately in step 5 | `src/server/services/balance.ts` |
| 14 | Every item change is logged and shown | Built (category changes, the only change allowed after saving) | `changeItemCategory`, `itemHistory`, `receipts/[receiptId]/page.tsx` |
| 14a | Category creation and rule changes are logged and shown; categories can be created at review, with Add category, or from any item's dropdown | Built | `saveReceipt`, `createCategory`, `src/components/ItemCategoryPicker.tsx`, `setRule`, `categoryHistory`, `categories/history/page.tsx` |
| 15 | Shares in cents, largest remainder rounding, always adds up to the price | Built and used by the balance | `src/domain/money.ts` (`splitCents`), `src/domain/balance.ts` |

## Balance (build step 3)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 16 | Each sharer owes the payer; debts netted to one line per pair | Built | `src/domain/balance.ts` (`computeBalance`), `balance/page.tsx` |
| 17 | Unsorted items are left out of the balance and counted | Built | `src/domain/balance.ts`, `balance/page.tsx` |
| 17a | Balance opens on the open period; a closed period needing agreement shows as one card | Partly built: the open period's dates show; the rest is step 5 | `src/app/groups/[groupId]/balance/page.tsx` |

## Periods and closing (build step 5)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 18 | The group chooses and can change the close rule; a change applies now (open period ends on the new rule's first close date from today); who changed it last is shown | Built | `src/domain/ledgers.ts` (`endAfterRuleChange`), `setCloseRule` in `src/server/services/periods.ts`, `groups.close_rule_changed_by` and `_at`, `invite/CloseRuleForm.tsx` |
| 19a | Periods are named from their dates: a whole month by the month, otherwise the range | Built | `periodLabel` in `src/domain/periods.ts`; Home, Balance, period screen, Payments, Home's Balance line |
| 19 | A period closes after its end date and the next opens; checked when group data loads, by the device's date | Built | `src/domain/periods.ts` (`periodForToday`), `src/server/services/periodClock.ts`, `src/components/DeviceDate.tsx` |
| 20 | A closed period takes no new receipts or edits, except sorting leftovers (any member), removing them (payer only), and setting rules | Built | `changeItemCategory`, `deleteItem` in `src/server/services/categories.ts`, `balance/[ledgerId]/page.tsx` |
| 21 | Agree only when nothing is unsorted and every used category has a rule | Built | `src/domain/periods.ts` (`agreeBlockedBy`), `agree` in `src/server/services/periods.ts`, `AgreeButton.tsx` |
| 22 | Each member agrees to their amount; any change before everyone agrees clears agreements | Built | `agree`, `clearOpenAgreements` (called by `setRule`, `changeItemCategory`, `deleteItem`) |
| 22a | Two stage settling: amounts frozen when the last member agrees; settled when all paid | Built | `agree` in `src/server/services/periods.ts` (stage 1, and settled at once when nothing is owed), `positionWords` and `debtWords` in `src/domain/periods.ts` (settled periods worded in the past), `settleIfPaid` in `src/server/services/payments.ts` with `isSettled` in `src/domain/payments.ts` (stage 2), `ledgers.frozen_lines`, `ledgers.frozen_rules`, `ledgers.settled_at` |
| 23a | Every period has a breakdown by category, per person, that matches its amount; past periods are listed | Built | `src/domain/breakdown.ts`, `balance/[ledgerId]/Breakdown.tsx`, `getPeriod` and `listClosedPeriods` in `src/server/services/periods.ts`, `balance/page.tsx` |
| 23 | The next period opens on time whether or not anyone agreed | Built | `ensurePeriods` in `src/server/services/periodClock.ts` |

## Payments (build step 6)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 24 | Only the payer records a payment, from the agreed period, part payments allowed up to what is left (after waiting payments), date not in the future | Built | `checkPayment` and `debtStatus` in `src/domain/payments.ts`; `recordPayment` in `src/server/services/payments.ts` (payer is always the caller); database checks on `payments` in `src/server/db/schema.ts`; form in `balance/[ledgerId]/RecordPayment.tsx` |
| 25 | Counts only after the person paid confirms; payer can cancel, person paid can decline while waiting (kept in the history as cancelled or declined, a decline shown on the period's line); confirmed is final; settled when all paid | Built | `confirmPayment`, `removePayment` (sets `removed_at`, `removed_by`), `settleIfPaid` in `src/server/services/payments.ts`; `isSettled` in `src/domain/payments.ts` |
| 26 | Payment history, still owed, a yearly total per pair; paid and left per amount on the period screen | Built | `listPayments`, `periodPayments` in `src/server/services/payments.ts`; `yearTotals` in `src/domain/payments.ts`; `balance/payments/page.tsx` (waiting for you, history, totals), `balance/[ledgerId]/page.tsx` (confirmed and left per line) |
| 0c | Home's Balance line shows the most pressing thing waiting (confirm a payment, a declined payment, a period to agree, a payment to record), otherwise when the period closes; no amounts | Built | `balanceLine` in `src/domain/home.ts`, `balanceSituation` in `src/server/services/payments.ts`, `groups/[groupId]/page.tsx` |

## Architecture rules (ARCHITECTURE.md section 3; A8 from CLAUDE.md)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| A1 | Business rules live in `src/domain` | Followed | `src/domain` |
| A2 | Only services read or write the database | Followed | `src/server/services`, `src/server/db/client.ts` |
| A3 | Every page action is also in `/api/v1` | Followed for step 1 | `src/app/api/v1`, `docs/API.md` |
| A4 | Membership checked in the service layer on every call | Followed | `getGroupForMember` in `src/server/services/groups.ts` |
| A5 | Money in integer cents, shares in basis points | Followed | `src/domain/money.ts`, `src/server/db/schema.ts` |
| A6 | Photos upload straight from the browser to storage | Not built (step 2) | |
| A7 | Periods close when group data is loaded, no scheduled job | Not built (step 5) | |
| A8 | The browser cannot read tables: Row Level Security on, no policies | Built | `src/server/db/migrations/0001_enable_rls.sql`, `0002_category_changes.sql` |

## Points to watch

- Decided 6 Nov (rule 2c): dates follow the device's local date. Built for group creation; steps 2 and 5 must send and use it too. Members of one group in different time zones may see the date change at different times; accepted as simple enough.
