/**
 * Who is signed in.
 *
 * What it holds: the functions that turn a Supabase sign in session into the app's simple
 * user (id, email, name), for pages and for API calls.
 *
 * Why it matters: every member must be a real, signed in person, because agreeing to an
 * amount and confirming a payment only mean something if we know who did it (SPEC.md rule 1,
 * stories US8 and US9). Sign in is with Google, so the app stores no passwords.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** The signed in person as the rest of the app sees them. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Converts a Supabase user into an AuthUser. The name comes from the Google account; if Google
 * gives none, the part of the email before the @ is used. A user with no email is refused (null),
 * because the users table requires one.
 */
function toAuthUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser | null {
  if (!u.email) return null;
  const meta = u.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    u.email.split("@")[0];
  return { id: u.id, email: u.email, name };
}

/** The signed in user from the browser's session cookie, or null if nobody is signed in. Used by pages. */
export async function currentUser(): Promise<AuthUser | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? toAuthUser(data.user) : null;
}

/**
 * The user calling an API route. Two ways to prove who you are:
 * a bearer token in the Authorization header (for other applications, documented in docs/API.md),
 * or the browser's session cookie (for the app's own pages).
 */
export async function apiUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    // Ask Supabase whether the token is valid and whose it is. Nothing is stored.
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { persistSession: false } },
    );
    const { data } = await client.auth.getUser(header.slice(7));
    return data.user ? toAuthUser(data.user) : null;
  }
  return currentUser();
}
