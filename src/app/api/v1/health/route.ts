/**
 * GET /api/v1/health: shows whether the app can reach its database. No sign in needed.
 * Used to check a deploy worked (docs/WORKLOG.md, "step 0 verified on Vercel").
 */

import { databaseIsUp } from "@/server/services/system";

export const dynamic = "force-dynamic";

/** Answers 200 with status "ok", or 503 with "degraded" when the database does not answer. */
export async function GET() {
  const database = await databaseIsUp();
  return Response.json(
    { status: database ? "ok" : "degraded", database },
    { status: database ? 200 : 503 },
  );
}
