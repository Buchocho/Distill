/**
 * Sign in guard for pages.
 *
 * Why it matters: every screen except Sign in needs a signed in user. This sends anyone else to
 * Sign in and, once they are signed in, brings them back to the page they wanted. That is what
 * makes an invite link work for someone who is not signed in yet (SPEC.md rule 2).
 */

import "server-only";
import { redirect } from "next/navigation";
import { currentUser, type AuthUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";

/**
 * Returns the signed in user, or sends the browser to /login with a note to come back to
 * `nextPath` afterwards. Also makes sure the user's row exists in the database.
 * The name returned is the one stored in Distill, which the person may have changed
 * (SPEC.md rule 1), not the Google name.
 */
export async function requireUser(nextPath: string): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const row = await ensureUser(user);
  return { ...user, name: row.displayName };
}
