import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser. Used only for sign in and, later, signed photo uploads. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
