# Distill API (v1)

Base path: `/api/v1`. Every endpoint returns JSON. Errors return `{ "error": "...", "fields": { ... } }` with status 400, 401, 404 or 500.

Authentication: the browser session cookie, or `Authorization: Bearer <Supabase access token>` for other applications.

| Method | Path | What it does |
|---|---|---|
| GET | /health | App and database status. No sign in needed. |
| GET | /me | The signed in user and their groups. |
| GET | /groups | The user's groups. |
| POST | /groups | Create a group. Body: `{ "name": "Rua das Flores 12", "closeRule": "month_end" \| "month_day" \| "weekly", "closeDay": number \| null, "currency": "EUR", "localDate": "2026-11-06" }`. `currency` is optional (default `EUR`) and must be a two decimal code from `src/domain/currencies.ts`. `localDate` is optional: the caller's own date, which starts the first ledger; without it the UTC date is used, and a date more than one day from UTC is refused. Opens the first ledger. |
| GET | /groups/{groupId} | Group, members and open ledger. Members only. |
| GET | /invites/{token} | Group name, members, close rule and currency behind an invite link. |
| POST | /invites/{token}/join | Join the group behind an invite link. Joining twice is harmless. |
| GET | /groups/{groupId}/receipts | The group's receipts, newest first (30 at most): status, store, date, total, who paid, number of items with no category. Receipts still uploading are left out. Members only. |
| POST | /groups/{groupId}/receipts | Start a receipt in the open period. Body: `{ "paidBy": "<member user id>" }` (optional, default the caller). Returns `{ "receiptId", "upload": { "path", "token" } }`. Upload the photo (JPEG, at most 10 MB) to Supabase Storage bucket `receipt-photos` with `uploadToSignedUrl(path, token, file)`, then call `/receipts/{id}/read`. |
| POST | /receipts/{receiptId}/read | Read the photo with Gemini. Returns `{ "status": "ready" }` or `{ "status": "failed" }`. Calling it again is Retry. Can take up to a minute. Not allowed once the receipt is saved. |
| GET | /receipts/{receiptId} | The receipt, its items (with `categoryId` or `proposedCategory`), the group's categories and members, the group `currency`, and 10 minute links to view the photos. Members only. |
| POST | /receipts/{receiptId}/save | Save a receipt in status `ready`. Body: `{ "storeName", "purchaseDate": "YYYY-MM-DD" \| null, "totalCents": number \| null, "paidBy", "items": [{ "name", "priceCents", "categoryId" \| null, "proposedCategory" \| null }] }`. Prices are whole cents, negative for discounts. Items may have no category. Proposed categories are created, reusing one with the same name. A receipt is saved once. |
