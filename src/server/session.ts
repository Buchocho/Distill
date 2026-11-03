import "server-only";
import { redirect } from "next/navigation";
import { currentUser, type AuthUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";

/** For pages: the signed in user, or a redirect to sign in that comes back to `nextPath`. */
export async function requireUser(nextPath: string): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  await ensureUser(user);
  return user;
}
