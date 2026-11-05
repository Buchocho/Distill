/**
 * Supabase connection for code that runs on the server, used only to read the sign in session
 * from the browser's cookies. Data is read through src/server/db, not through this client.
 */

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Creates a Supabase client for server pages, server actions and route handlers. Sign in only. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) cookieStore.set(name, value, options);
          } catch {
            // Called from a server component, where cookies are read only. The middleware refreshes them.
          }
        },
      },
    },
  );
}
