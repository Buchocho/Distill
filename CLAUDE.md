# CLAUDE.md: project rules for Distill

Read this file, SPEC.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md, docs/CODE_MAP.md and docs/BUSINESS_RULES.md at the start of every session.

## What this project is

Distill, a mobile-first web app for splitting shared grocery receipts. MVP for the Information Systems Architecture course at FEUP, due 15 Nov 2026. SPEC.md is the source of truth for what to build.

## Scope

- Build only what SPEC.md lists. If a task seems to need something outside it, stop and ask. Do not add features, settings or screens on your own.
- Work on one step of the build order (SPEC.md section 6) at a time. Do not start the next step until the current one passes its tests and has been checked by hand.
- When a business rule in SPEC.md is unclear, ask. Do not guess and do not change the rule silently.

## Architecture rules

- Business rules go in `src/domain` as pure functions. No database, network or framework imports there.
- Only `src/server/services` reads or writes the database. Pages, components and API routes call services.
- Every action a page can do is also available under `/api/v1`.
- Check group membership in the service layer on every read and write.
- Money is integer cents. Shares are basis points. Never use floating point for money.
- Use the largest remainder method for splitting cents, from `src/domain/money.ts`. Do not write a second rounding function.
- Gemini and Supabase service keys are used only on the server.
- Row Level Security is on for every table with no policies. Never add a policy that lets the browser read or write tables directly. The browser uses Supabase only for sign in and signed photo uploads.
- Schema changes go through Drizzle migrations. Update docs/DATA_MODEL.md in the same change. Every new table gets `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in its migration.

## Code style

- TypeScript strict mode. No `any`.
- Small files with one purpose. Name files after what they hold.
- Use the existing components in `src/components` before writing new ones.
- No new dependencies without saying why and asking first.

## Comments and code documentation

The readers are Maduabuchi and the teacher marking the build. Write for someone who knows the product, not the framework. Plain English, no lessons on how the language works.

- Every source file starts with a short header: what the file holds, why it matters to the product, and the SPEC.md rule numbers or stories it serves.
- Every exported function, and any helper whose purpose is not obvious, has a comment block above it: what it does, why it exists in business terms, and the rule it applies (for example "SPEC.md rule 22").
- Explain the reason, not the code. Do not write comments that repeat what a line plainly does. Add a short comment inside a function only where a step would otherwise make a reader stop (a rounding step, a date conversion, a security check).
- Name business rules by their SPEC.md number, and architecture rules by their ARCHITECTURE.md section 3 number, so every reference can be found in docs/BUSINESS_RULES.md.
- A screen that is a placeholder says PLACEHOLDER in its header and names the step that builds it.
- Do not put comments inside JSX markup; put them above the component or above the return.
- Do not edit a migration file after it has been applied. Explain migrations in docs/CODE_MAP.md instead.
- In the same commit as the code change: update docs/CODE_MAP.md when a file or main function is added, removed, renamed or moved; update docs/BUSINESS_RULES.md when a rule is built, partly built or changed. A change is not done until both are current.

## UI rules

- Design at 375 px wide first, then check at desktop width.
- Tap targets at least 44 px. Text contrast at least WCAG AA.
- Amounts are shown in the group's currency with `formatMoney` or `formatCents` from `src/domain/money.ts` (SPEC.md rule 2b): euro as 12,90 €, other currencies as $12.90. Never format money anywhere else.
- Dates come from the device's local date (SPEC.md rule 2c). Do not use the server's date for which period something belongs to.
- Interface text is English, plain and short. No jargon.
- Every screen has loading, empty and error states.
- Bottom tab bar inside a group: Receipts, Categories, Balance.

## Testing and verification

- Every function in `src/domain` has unit tests in `tests/unit`, including rounding edge cases and negative prices.
- Every story has at least one Playwright test in `tests/e2e`, run at a phone viewport.
- Tests never call the real Gemini API. Use the fake responses in `tests/fixtures`.
- Before saying a task is done: run the type check, the linter and all tests, and report the results. If something fails, say so. Do not mark it done.
- Describe what the user should check by hand after each change.

## Git and record keeping

- One commit per finished piece of work, with a message that says what changed and why.
- Never commit `.env.local` or any key.
- At the end of each session, add an entry to `docs/WORKLOG.md`: the goal, the main prompts, what was changed, how it was verified, and anything left open.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (needs `.env.local`, see `.env.example`)
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Unit tests: `npm test`
- End to end tests: `npm run test:e2e` (set `CHROMIUM_PATH` if Playwright's browser is not installed)
- New migration after a schema change: `npm run db:generate -- --name <what_changed>`
- Apply migrations: `npm run db:migrate`. On Vercel this runs automatically in `vercel-build` before every deploy.
- Seed: added in a later step.
