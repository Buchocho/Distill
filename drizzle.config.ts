/**
 * Settings for drizzle-kit, the tool that turns src/server/db/schema.ts into migrations and runs them.
 * Runs on Vercel before every deploy (`vercel-build` in package.json) and locally with `npm run db:migrate`.
 */

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  // Migrations use the session pooler (port 5432 on the same host), because
  // schema changes are not safe through the transaction pooler (port 6543).
  dbCredentials: { url: (process.env.DATABASE_URL ?? "").replace(":6543/", ":5432/") },
});
