# Distill: build specification (SPEC.md)

Author: Maduabuchi Ogugua Dibiaezue
Course: Information Systems Architecture, Assignment 2 (MVP), due 15 Nov 2026
Source: the approved Assignment 1 specification (Distill, 14 slides), plus one change listed in section 7.
Status: draft, 25 Oct 2026.

## 1. Product in one paragraph

A group of people who shop together scan their receipts. Each item gets a category, each category carries a sharing rule, and the app works out who owes whom. On a date the group chooses, the period closes, every member agrees to their amount, and payments between members are recorded once both people confirm. No money moves inside the app.

## 2. Users

- **Main shopper (Ana):** buys most of the food, wants to be paid back in full and on time.
- **Light user (Rui):** buys little, uses fewer shared items, wants to pay only for what he uses.
- **Low-effort member (Sam):** rarely shops, does not sort items, wants one amount to check and agree to.

## 3. User stories (all must have for this MVP)

| # | Story | Accepted when |
|---|---|---|
| US1 | As a group member, I want to create a group and invite the others by link, so that we all work from the same record. | The invite link adds a member. All members see the same data. |
| US2 | As the main shopper, I want to scan a receipt instead of typing it, so that adding a shop takes one photo. | Each item has a price and a category. Items sum to the total. |
| US3 | As the light user, I want to set a sharing rule for each category, so that I only pay for what I use. | Any split across any members. Shares total 100%. |
| US4 | As the light user, I want to see how each item was shared and change it, so that I can correct a split I disagree with. | Any member can change an item. The change is visible to all. |
| US5 | As the low-effort member, I want to skip an item that has no category, so that I am not stopped from saving the receipt. | The receipt still uploads. The item joins the unsorted list. |
| US6 | As a group member, I want to choose the date accounts close, so that we settle on a schedule we agreed. | The period freezes on the date. The next opens automatically. |
| US7 | As the main shopper, I want leftover items sorted or deleted at the close, so that the amount I am owed is final. | The balance is final only when the unsorted list is empty. |
| US8 | As the low-effort member, I want one amount to check and agree to, so that settling takes one tap. | Each member's agreement is recorded. A change resets it. |
| US9 | As the main shopper, I want a payment recorded once both of us confirm it, so that there is a history of what I was paid back. | Shown as paid only when both people confirm. |

Not in this MVP (should and could from Assignment 1): spending by category, rename or merge categories, close date reminder, export of the payment record.

## 4. Business rules

Term: a period in the app is stored as a ledger in the database.

**Groups and members**
1. Signing in uses a Google account. The Google name is shown at first; a user can change the name they are shown as (1 to 30 characters), once for all their groups, and signing in again does not overwrite it.
1a. A member can sign out on the Invite people screen, which also holds their name in Distill (added 10 Nov 2026). Signing out ends the session on that device only; nothing in the group changes. Signing in always shows Google's account chooser, so a person can sign out and straight back in with another Google account.
1b. Privacy and Terms pages are public (no sign in) and linked from Sign in (added 10 Nov 2026, build step 7). They are needed to take Google sign in out of testing mode. Contact: the project's FEUP address.
2. The group creator is a member. Anyone with the invite link who signs in becomes a member.
2a. Members see each other's name and Google email on Invite people, so they can tell which account joined (decided 10 Nov 2026). The Start screen shows which account is signed in, with Sign out.
2b. The group chooses a currency when it is created (default euro). It is display only: amounts are shown in that currency and nothing is converted. Only currencies with two decimal places are offered, so money stays in whole cents. The currency cannot be changed after the group is created.
2c. Dates follow the local date of the device doing the action (for example creating a group or scanning a receipt), not the server's date. No time zone is stored.
3. Every member has the same rights. There is no admin.
3a. After sign in, a user with no group sees a short choice: create a group or join one with a link. A user with a group goes straight to Home.
3b. A user can belong to several groups (decided 10 Nov 2026). After sign in, a user in one group goes straight to its Home; a user in two or more sees Your groups and picks one. Tapping the group name on Home opens Your groups, to switch group or create another. Joining another group is through its invite link.

**Receipts**
4. A member adds only their own receipts: the payer is always the person who scans it, and only they can review, save or delete it before it is saved. Someone holding another member's receipt sends them a photo to upload. (Changed 9 Nov 2026 from "any member chooses who paid", so nobody can record a purchase as someone else's.)
5. A receipt belongs to the period that is open when it is added, whatever date is printed on it.
6. The reading step returns store, date, printed total, receipt number, and items with name, price and discount. Dates are read using the device's date to settle the order (some shops print year first, 26/10/18 for 18 Oct 2026); the review screen asks to check a date in the future or more than 60 days ago. An item's price is what was paid for it after its own discount, however the shop prints it; the discount is kept for information only and is never summed or split. A discount on the whole receipt that belongs to no item (a voucher) stays its own line with a negative price. Tax printed as a separate line (for example US or Canadian sales tax) is an item, categorised and split like any other, so the items still sum to the printed total.
7. Each item is given a category from the group's list. Categories are at the level of the product type (Cola, Orange juice, Apple juice, Milk, Oat milk), never a shop aisle (Soft drinks, Dairy) and never a brand or pack size, because the sharing rule is set per category and products one person buys only for themselves need their own category. If none fits, the reading step may propose a new category name. A proposed category is created only when the receipt is saved; saving counts as confirming it. After that it is reused for later receipts. If the reading step cannot choose, the item is unsorted.
8. The review screen shows the sum check: items total against printed total, and the difference if they do not match. The user can edit names and prices before saving.
9. Saving is never blocked by unsorted items (US5).
9a. A receipt can have any number of photos. Once it is saved into the ledger, no photos can be added or removed.
9b. A receipt that is not saved yet can be deleted with its photo, after a confirm step. A saved receipt cannot be deleted.
9c. The reading step also returns the receipt's own number (document or transaction number, not a tax number). A receipt with the same store and receipt number as a saved receipt in the group cannot be saved. Otherwise, a receipt with the same store, date and total as a saved one shows a warning, even when the receipt numbers differ (a number can be misread or cropped), and the person can delete it or save it anyway. Store names are compared without accents, capitals or punctuation.
10. If reading fails, the receipt is kept with its photos and status "failed", and the user can retry. A reading cut off by the server time limit (still "reading" 90 seconds after it started) is shown as failed, with Retry (fixed 10 Nov 2026).

**Sharing**
11. A category's rule is one of: Everyone equal (split between all current members); Whoever paid (the receipt's payer carries the item, so it moves no money, for example each person's own chocolate bars); One person (always the same member); Custom (chosen members and percentages totalling exactly 100%).
12. A category with no rule is not split. Its items are treated like unsorted items: left out of the balance and flagged as needing a rule. One "needs sorting" flag on the Categories tab and a line on Home show how many items are unsorted or without a rule, whenever there is at least one; any member can set the rule.
13. Any member can change a saved item's category while its period is open. After saving, the item's name and price cannot change. An item always follows its category's rule; there are no per item splits.
13a. A rule change applies to every item in that category in the open period, including items already added. Closed periods are not changed.
14. Every change to an item is logged with who made it and when, and shown on the item (US4).
14a. Any member can create a category or change its rule. Every creation and rule change is logged with who made it and when. All members can see this history from the Categories screen. (Notifications about these changes are for a later version.)
15. Shares are calculated in cents. Rounding uses the largest remainder method, so the shares of an item always add up to its price exactly.

**Balance**
16. For each sorted item, every sharer other than the payer owes the payer their share. Debts between two people are netted, giving at most one line per pair: "Rui owes Ana 18,40".
17. Unsorted items, and items in categories without a rule, are not in the balance. The balance screen shows how many there are.
17a. The Balance tab opens on the open period. A closed period that still needs agreement is shown as one card linking to it. There is no list of all past periods in this version.

**Periods and closing**
18. The group chooses the close rule: last day of the month, a day of the month (1 to 28), or a day of the week. Any member can change it on the members screen. Decided 10 Nov 2026: the change applies now; the open period ends on the new rule's first close date from today (today counts, never a date in the past), and later periods follow the rule. The screen shows the new end date before saving, and who last changed the setting and when.
19. A period runs from its start date to its end date inclusive. After the end date passes, it closes and the next period opens the following day (US6). Closing is checked whenever group data is loaded, using the device's date (rule 2c). Periods in which nobody used the app are skipped.
19a. A period is named from its dates (decided 10 Nov 2026): a period that is exactly one calendar month by the month ("October"), any other period by its range ("4–10 Nov", "11 Oct – 10 Nov"), with the year when it is not the current year. The name is used everywhere a period is shown.
20. A closed period takes no new receipts and no edits, with two exceptions: its unsorted items can be given a category (any member) or removed (only the person who paid for that receipt; logged), and rules can be set for categories that have none (US7).
21. The Agree button for a period is active only when that period has no unsorted items and every category used in it has a rule (US7).
22. Each member agrees to their own amount. Until everyone has agreed, the period's amounts follow the current rules, and any change that can move them (sorting or removing a leftover item, setting or changing a rule) clears all agreements for the period (US8).
22a. Settling has two stages (agreed 10 Nov 2026). Stage 1: when the last member agrees, the period's amounts are frozen; later rule changes do not touch it. Stage 2: when every amount owed is confirmed paid (rule 25), the period is settled and read only.
23. The next period opens on time whether or not anyone agreed.
23a. Every period, open or closed, has a breakdown a member can check before agreeing (approved design 10 Nov 2026): for each category, the person's share as the main figure, how many times it was bought and the total, and how it was split in words; each purchase and who paid it on tap; and totals (paid, share, owed) that match the period's amount. Any member's statement can be viewed. The Balance tab lists all past periods with the reader's amount and status.

**Payments**
24. The person who paid records a payment against a ledger: who paid, who received, amount, date. Decided 10 Nov 2026: only the payer records, from the agreed period's screen, on their own line ("You owe Rui"); the person paid confirms. Accepted weakness: if the payer never records, the person owed cannot mark it paid. Payments can be recorded only once everyone has agreed the period (stage 1, rule 22a) and until it is settled; one payment covers one period; part payments are allowed, but a payment can never be more than is left for that pair in that period after payments already waiting; the date cannot be in the future.
25. It shows as paid only after the other person confirms it (US9). Until then it shows as waiting. A confirmed payment reduces what is owed between those two people in that ledger. While it is waiting, the payer can cancel it and the person paid can decline it; a cancelled or declined payment stops counting but stays in the history marked as such, and a declined one shows on the period's line until the payer records again; a confirmed payment cannot change. When confirmed payments cover every amount owed in a period, the period is settled (rule 22a). A period agreed with nothing owed is settled at once.
26. The payment screen shows the history and a total per pair for the current year. Payments waiting for the reader to confirm are listed first. The period screen shows confirmed and left on each amount.

## 5. Screens

All screens are designed at phone width first. Bottom tab bar on every screen inside a group: Receipts, Categories, Balance. Sign in, New group and Join lead to Home. Home sits outside the tabs; on the first screen of each tab, tapping the Distill mark at the top left goes back to Home.

| # | Screen | Route | Stories |
|---|---|---|---|
| 0 | Sign in with Google | /login | US1 |
| 0a | Start: create a group or join one (first sign in, no group yet) | /start | US1 |
| 0d | Your groups: every group the user is in, Create a group, signed in account and Sign out | /groups | US1 |
| 0b | Join a group from an invite link | /join/[token] | US1 |
| 0c | Home: landing page outside the tabs, three sections stacked dark to light: Receipts (scan), Categories (what needs a rule), Balance (the most pressing thing waiting in Balance: confirm a payment from someone, a declined payment, a closed period to agree, a payment to record; only otherwise when the open period closes; no amounts, decided 10 Nov 2026). Each shows a live one line status and opens its tab. Drawn stick figures with motion, no photos | /groups/[id] | US1 to US9 |
| 1 | New group: name, members by invite link, close rule, currency | /groups/new | US1, US6 |
| 2 | Receipts: take a photo, choose a file, paid by, recent receipts with status | /groups/[id]/receipts | US2 |
| 2a | Receipt photos: one or more sections, reorder, retake | /groups/[id]/receipts/capture | US2 |
| 3 | Review receipt: header, items with price, category and who shares, sum check, save | /groups/[id]/receipts/[receiptId] | US2, US4, US5 |
| 4 | Categories and sharing rules, rule editor | /groups/[id]/categories | US3 |
| 4c | Category history: who created or changed which rule, and when | /groups/[id]/categories/history | US3 |
| 5 | Balance: open period balance; closed periods with unsorted items, balance and agree | /groups/[id]/balance | US6, US7, US8 |
| 6 | Payments: waiting for you (confirm, decline), history, yearly total. Recording is on the agreed period screen | /groups/[id]/balance/payments, /groups/[id]/balance/[ledgerId] | US9 |

Every form shows validation errors next to the field. Every screen has a loading state and an error state with a retry.

## 6. Build order

Each step works end to end, with tests, before the next starts. A step is done only when Maduabuchi has approved its screens against the approved design and the Assignment 1 wireframes, and the LLM design check (hierarchy, contrast, spacing, consistency, accessibility, phone fit) has been run on them.

| Step | Content | Target date |
|---|---|---|
| 0 | Repo, Supabase project, migrations for all tables, Google sign in set up, keep alive job, empty app deployed to Vercel | 27 Oct |
| 0b | UI design: approved 3 Nov. Design canvas "Distill screens", page v2 (colour journeys: Receipts dark, Categories orange, Balance white) is the reference | 3 Nov |
| 1 | US1: sign in, create group, invite link, join | 29 Oct |
| 2 | US2 and US5 with one photo: capture, reading, review, save, unsorted items | 1 Nov |
| 3 | US3 and US4: categories, rules, item changes and change log; open period balance | 3 Nov |
| 4 | Multi photo receipts (section 7). Moved after steps 5 to 7 on 10 Nov; built only if time is left | 4 Nov |
| 5 | US6, US7, US8: close rule, closing, sorting leftovers, agree | 6 Nov |
| 6 | US9: payments | 8 Nov |
| 7 | Remaining tests, UX review by the LLM against the Assignment 1 mockups, manual check of every screen, privacy page and Google sign in published (out of testing mode), data tables PDF, screenshots, demo script and rehearsal | 9 to 15 Nov |

## 7. Change from the approved specification

Multi photo receipts: a receipt can be made of one or more photos taken in sections, read together as one receipt. Reason: a long receipt in one photo is too small to read. It extends US2 and does not add a screen to the tab bar. Full detail in `docs/features/multi-photo-receipt.md`.

Category rules (agreed 2 Nov 2026): the approved specification split a category with no rule evenly between everyone. Now a category with no rule is not split; its items count as unsorted until someone sets a rule, and the period cannot be agreed until every category used in it has one. Reason: an even split hides the missing decision, and the period should not settle on a guess. Category creation and rule changes are also logged and visible to every member.

## 8. Demo data

Group "Rua das Flores 12" with members Ana, Rui and Sam. A seed script loads categories with rules, a closed period with receipts, and one pending payment, so the demo can show every story in 5 minutes.

## 8b. Later versions (roadmap, not in this MVP)

- Home section order per person: each member can reorder the three Home sections to put what matters to them first. For now the order is fixed: Receipts, Categories, Balance.
- Notifications when a category is created or its rule changes.
- Whole-receipt discounts (vouchers, coupons on the total) spread across the items or shared by rule. Until then they are a negative line (rule 6).
- Rename or merge categories, spending by category, close date reminder, export of the payment record.

## 9. Open questions

None at present.
