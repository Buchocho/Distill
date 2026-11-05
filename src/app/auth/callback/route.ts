/**
 * /auth/callback: where Google sends the user back after sign in (SPEC.md rule 1).
 * The address must be listed in the Supabase dashboard under allowed redirect URLs.
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Swaps the one time code from Google for a session cookie, then continues to the page the user
// wanted. Only addresses inside this app are allowed as the next page, so a crafted link cannot
// send someone to another site after sign in. On failure, back to /login with an error message.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}
