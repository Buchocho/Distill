/**
 * Supabase connection for code that runs in the browser.
 *
 * Why it matters: the browser only talks to Supabase for sign in and, from step 2, for uploading
 * receipt photos with signed links. It never reads or writes tables: Row Level Security is on with
 * no policies, so the public key used here cannot reach any data (CLAUDE.md, migration 0001).
 */

import { createBrowserClient } from "@supabase/ssr";

/** Creates the browser's Supabase client. Used only for sign in and, later, signed photo uploads. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
