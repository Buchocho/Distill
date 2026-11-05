/**
 * System service: health and keep alive checks. Not part of any user story.
 *
 * Why it matters: the app runs on a free Supabase project, which pauses after a period with no
 * activity. A paused project would take the app offline before the demo or later assignments.
 * The daily keep alive job (see vercel.json and src/app/api/cron/keep-alive) calls this file.
 * Decision recorded in docs/WORKLOG.md, 2026-10-25 "hosting decision".
 */

import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/**
 * Keeps the Supabase project active: runs one tiny database query and one request to the
 * Supabase sign in service. Returns which of the two answered.
 * Both are touched because Supabase counts activity on the project, not only the database.
 */
export async function keepAlive(): Promise<{ database: boolean; supabaseApi: boolean }> {
  await db.execute(sql`select 1`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseApi = false;
  if (url && key) {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: "no-store" });
    supabaseApi = res.ok;
  }
  return { database: true, supabaseApi };
}

/** True when the database answers. Used by /api/v1/health to show the app is working. */
export async function databaseIsUp(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
