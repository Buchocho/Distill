# Distill

Shared shopping, sorted. The fair way to split grocery bills.

MVP for the Information Systems Architecture course (FEUP), by Maduabuchi Ogugua Dibiaezue.

- What is built: [SPEC.md](SPEC.md)
- Architecture and folders: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Data tables: [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- Rules for the LLM agent: [CLAUDE.md](CLAUDE.md)
- Work log: [docs/WORKLOG.md](docs/WORKLOG.md)

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. `npm run db:migrate`
4. `npm run dev` and open http://localhost:3000

## Stack

Next.js on Vercel, PostgreSQL with sign in and photo storage on Supabase, Gemini for reading receipts.
