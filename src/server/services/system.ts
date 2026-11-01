import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/** Runs one small query and one Supabase API request, so the free project is not paused. */
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

/** Checks that the database answers. Used by the health endpoint. */
export async function databaseIsUp(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
