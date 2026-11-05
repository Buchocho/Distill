# Distill: business rules register

Author: Maduabuchi Ogugua Dibiaezue
Last updated: 5 Nov 2026, end of build step 1 (sign in and groups).

Each business rule in SPEC.md section 4, whether it is built, and the files that enforce it. Rule numbers are the SPEC.md numbers, so a code comment that says "SPEC.md rule 15" points to the same row here.

Use it to answer two questions: how far the build has gone, and if a rule changes, which files have to change.

Keep it current: a change that builds or changes a rule updates its row in the same commit (CLAUDE.md). A rule changes in SPEC.md first.

Status: **Built** (works and is tested or checked by hand), **Partly built** (some of it works; the note says what is missing), **Not built** (the step that builds it is given), **Prepared** (only the database table or check exists so far).

## Groups and members

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 1 | Sign in with Google; a user can change their display name | Partly built: sign in works; changing the display name is not built | `src/server/auth.ts`, `src/app/login`, `src/app/auth/callback/route.ts`, `src/server/services/users.ts` |
| 2 | The creator is a member; anyone with the invite link who signs in joins | Built | `src/server/services/groups.ts` (`createGroup`, `joinByToken`), `src/server/session.ts` (returns to the link after sign in) |
| 3 | Every member has the same rights, no admin | Built (by design: there is no role to check) | `group_members` table in `src/server/db/schema.ts` |
| 3a | No group after sign in goes to Start; otherwise Home | Built | `src/app/page.tsx`, `src/app/start/page.tsx` |

## Receipts (build steps 2 and 4)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 4 | Any member adds a receipt and chooses who paid | Not built (step 2) | |
| 5 | A receipt belongs to the period open when it is added | Prepared: `receipts.ledger_id` | `src/server/db/schema.ts` |
| 6 | Reading returns store, date, total and items; discounts are negative | Not built (step 2). Negative amounts already split correctly. | `src/domain/money.ts` |
| 7 | Items get a category; new ones are created when the receipt is saved | Prepared: category names unique per group | `src/server/db/schema.ts` |
| 8 | Review shows items total against printed total | Not built (step 2) | |
| 9 | Saving is never blocked by unsorted items | Not built (step 2) | |
| 9a | Any number of photos; locked once saved | Prepared: `receipt_photos`, status `saved` | `src/server/db/schema.ts` |
| 10 | A failed reading keeps the receipt with status "failed" for retry | Prepared: status `failed` | `src/server/db/schema.ts` |

## Sharing (build step 3)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 11 | A category's rule lists sharers and percentages totalling 100% | Prepared: each share must be 1 to 10000. The 100% total is not checked yet. | `src/server/db/schema.ts`, `src/domain/money.ts` (`FULL_SHARE_BP`) |
| 12 | A category with no rule is not split; its items count as unsorted | Not built (step 3) | |
| 13 | Any member changes an item's category; items always follow their category's rule | Not built (step 3) | |
| 13a | A rule change applies to the open period only | Not built (step 3) | |
| 14 | Every item change is logged and shown | Prepared: `item_changes` table | `src/server/db/schema.ts` |
| 14a | Category creation and rule changes are logged and shown | Prepared: `category_changes` table | `src/server/db/schema.ts` |
| 15 | Shares in cents, largest remainder rounding, always adds up to the price | Built and tested; not used by any screen yet | `src/domain/money.ts` (`splitCents`) |

## Balance (build step 3)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 16 | Each sharer owes the payer; debts netted to one line per pair | Not built (step 3) | |
| 17 | Unsorted items are left out of the balance and counted | Not built (step 3) | |
| 17a | Balance opens on the open period; a closed period needing agreement shows as one card | Partly built: the open period's dates show; the rest is step 5 | `src/app/groups/[groupId]/balance/page.tsx` |

## Periods and closing (build step 5)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 18 | Close rule: last day of month, a day 1 to 28, or a weekday; can be changed | Partly built: chosen when the group is created and checked in the app and the database. Changing it later is not built, although the New group screen says "You can change it later". | `src/domain/ledgers.ts`, `src/domain/groups.ts`, `groups_close_day_valid` in `src/server/db/schema.ts` |
| 19 | A period runs start to end inclusive; the next opens the following day; checked when group data loads | Partly built: the first period opens when the group is created, and the date logic for the next one is written and tested. Closing on load is not built. | `src/domain/ledgers.ts` (`firstLedger`, `nextLedger`), `src/server/services/groups.ts`, `ledgers_one_open_per_group` in `src/server/db/schema.ts` |
| 20 | A closed period takes no new receipts or edits, except sorting leftovers and setting missing rules | Not built (step 5) | |
| 21 | Agree is active only with no unsorted items and every category used having a rule | Not built (step 5) | |
| 22 | Each member agrees to their amount; any change clears all agreements | Prepared: `agreements` table | `src/server/db/schema.ts` |
| 23 | The next period opens on time whether or not anyone agreed | Not built (step 5) | |

## Payments (build step 6)

| Rule | In short | Status | Enforced in |
|---|---|---|---|
| 24 | Payer or receiver records a payment | Prepared: the database refuses a payment recorded by someone else, to yourself, or of zero | `payments` checks in `src/server/db/schema.ts` |
| 25 | Shown as paid only after the other person confirms | Prepared: `confirmed_at` | `src/server/db/schema.ts` |
| 26 | Payment history and a yearly total per pair | Not built (step 6) | |

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

- Dates are worked out in UTC. Portugal is on UTC in winter but UTC+1 in summer, so between midnight and 1:00 in summer the app still counts the previous day. This matters for which period a late night receipt joins. To decide before step 5.
