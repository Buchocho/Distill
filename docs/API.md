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
