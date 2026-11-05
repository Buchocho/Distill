/**
 * GET /api/cron/keep-alive: the daily job that stops the free Supabase project from pausing.
 * Schedule: 06:17 UTC every day, set in vercel.json. See src/server/services/system.ts for why.
 * Not part of the public API and not listed in docs/API.md.
 */

import { keepAlive } from "@/server/services/system";

export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron. Vercel sends CRON_SECRET as a bearer token; any other caller
// gets 401, so outsiders cannot use this address to load the database. Results go to the Vercel logs.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await keepAlive();
    console.log("keep-alive ok", result);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("keep-alive failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
