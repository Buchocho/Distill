/**
 * Runs before every page request.
 *
 * Why it matters: a sign in session expires after a while. This refreshes the session cookie on
 * each page visit so a member who keeps using the app is not signed out in the middle of a task.
 * It does not block anyone; pages decide who may see them (src/server/session.ts).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the Supabase session cookie fresh. Copies any renewed cookie onto the response.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

// Which requests this runs for: all pages, but not static files, the API (which has its own sign in
// check in src/server/api.ts) or the Google sign in return address.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|auth/callback).*)"],
};
