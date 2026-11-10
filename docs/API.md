# Distill API (v1)

Base path: `/api/v1`. Every endpoint returns JSON. Errors return `{ "error": "...", "fields": { ... } }` with status 400, 401, 403 (a member, but not the one allowed, for example saving someone else's receipt), 404 or 500.

Authentication: the browser session cookie, or `Authorization: Bearer <Supabase access token>` for other applications.

| Method | Path | What it does |
|---|---|---|
| GET | /health | App and database status. No sign in needed. |
| GET | /me | The signed in user (with the name they are shown as) and their groups. |
| PATCH | /me | Change the name the user is shown as in every group. Body `{ "displayName": "Butch" }`, 1 to 30 characters. |
| GET | /groups | The user's groups. |
| POST | /groups | Create a group. Body: `{ "name": "Rua das Flores 12", "closeRule": "month_end" \| "month_day" \| "weekly", "closeDay": number \| null, "currency": "EUR", "localDate": "2026-11-06" }`. `currency` is optional (default `EUR`) and must be a two decimal code from `src/domain/currencies.ts`. `localDate` is optional: the caller's own date, which starts the first ledger; without it the UTC date is used, and a date more than one day from UTC is refused. Opens the first ledger. |
| GET | /groups/{groupId} | Group, members and open ledger. Members only. |
| GET | /invites/{token} | Group name, members, close rule and currency behind an invite link. |
| POST | /invites/{token}/join | Join the group behind an invite link. Joining twice is harmless. |
| GET | /groups/{groupId}/receipts | The group's receipts, newest first (30 at most): status, store, date, total, who paid, number of items with no category. Receipts still uploading are left out. Members only. |
| POST | /groups/{groupId}/receipts | Start a receipt in the open period, paid by the caller (members add only their own receipts). Returns `{ "receiptId", "upload": { "path", "token" } }`. Upload the photo (JPEG, at most 10 MB) to Supabase Storage bucket `receipt-photos` with `uploadToSignedUrl(path, token, file)`, then call `/receipts/{id}/read`. |
| GET | /groups/{groupId}/categories | Categories with their rule in words and item count in the open period; `needsSorting`, `unsortedItems`, `noRuleItems`. |
| POST | /groups/{groupId}/categories | Add a category. Body `{ "name" }`. Starts with no rule. |
| GET | /groups/{groupId}/categories/history | Category creations and rule changes, newest first, with who and when. |
| GET | /groups/{groupId}/to-sort | Items with no category and categories with items but no rule, in the open period. |
| GET | /groups/{groupId}/balance | Open period balance: `lines` (`from`, `to`, `cents`, names), `myNet` (positive: owed to the caller), `unsortedCount`, `noRuleCount`, `receiptCount`, `currency`. |
| GET | /categories/{categoryId} | One category with its rule, the members and the latest change. |
| PUT | /categories/{categoryId}/rule | Set the rule. Body `{ "kind": "everyone" \| "payer" \| "shares", "shares": [{ "userId", "bp" }] }`; `bp` is basis points (10000 = 100%), used only for `shares`, totalling 10000. Logged. |
| PATCH | /items/{itemId} | Move a saved item to another category, or to unsorted with `null`. Body `{ "categoryId" }`. Any item in the open period; only an unsorted item in a closed period not yet agreed. Logged. |
| DELETE | /items/{itemId} | Remove a leftover unsorted item from a closed period not yet agreed. Only the receipt's payer (403 otherwise). Logged. |
| PATCH | /groups/{groupId} | Change when accounts close. Body `{ "closeRule", "closeDay" }`. Applies from the next period. |
| GET | /groups/{groupId}/periods | Past (closed) periods, newest first, up to 24: `stage` (`closed`, `agreed`, `settled`), `myNet`, `iAgreed`, `agreedCount`, `memberCount`. |
| GET | /periods/{ledgerId} | One period, open or closed: `stage`, `lines`, `myNet`, `items` (each with category, price, payer, date, store and rule, for the breakdown), `unsorted`, `noRule`, `members` with `agreed`, `agreeBlockedBy`. |
| POST | /periods/{ledgerId}/agree | Agree to your amount. Refused (400) while items are left to sort. Returns the `stage`; `agreed` when the last member agreed and the amounts were frozen. |
| POST | /receipts/{receiptId}/read | Read the photo with Gemini. Optional body `{ "localDate": "YYYY-MM-DD" }`, the caller's date, used to read dates printed year first. Returns `{ "status": "ready" }` or `{ "status": "failed" }`. Calling it again is Retry. Can take up to a minute. Not allowed once the receipt is saved. |
| GET | /receipts/{receiptId} | The receipt, its items (with `discountCents`, and `categoryId` or `proposedCategory`), the group's categories and members, the group `currency`, `photoCount`, and `saved` (the group's other saved receipts: store, date, total, receipt number, who paid) for duplicate checking. Members only. |
| DELETE | /receipts/{receiptId} | Delete a receipt that is not saved yet, with its photos. A saved receipt is refused (400). |
| GET | /receipts/{receiptId}/photos/{n} | Redirects to a fresh 10 minute link to photo n (1 is the first). Members only. |
| POST | /receipts/{receiptId}/save | Save a receipt in status `ready`. Body: `{ "storeName", "receiptNumber" \| null, "purchaseDate": "YYYY-MM-DD" \| null, "totalCents": number \| null, "items": [{ "name", "priceCents", "discountCents" \| null, "categoryId" \| null, "proposedCategory" \| null }] }`. Prices are whole cents, the price paid after the item's discount; `discountCents` is information only. Negative only for a whole-receipt discount. Items may have no category. Proposed categories are created, reusing one with the same name. A receipt is saved once. Refused (400) when the same store and receipt number is already saved in the group. |
