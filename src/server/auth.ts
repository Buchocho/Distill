import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

function toAuthUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser | null {
  if (!u.email) return null;
  const meta = u.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    u.email.split("@")[0];
  return { id: u.id, email: u.email, name };
}

/** The signed in user from the session cookie, or null. */
export async function currentUser(): Promise<AuthUser | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ? toAuthUser(data.user) : null;
}

/**
 * The user calling an API route: a bearer token (for other applications) or the session cookie.
 */
export async function apiUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
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
