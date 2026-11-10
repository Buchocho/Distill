/**
 * Route: /  (the app's front door; it has no screen of its own).
 * Sends each person to the right place (SPEC.md rules 3a and 3b): signed out to Sign in, signed in
 * with no group to Start, one group straight to its Home, two or more to Your groups to choose.
 */

import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";
import { listMyGroups } from "@/server/services/groups";

export const dynamic = "force-dynamic";

// Entry point: signed out goes to sign in; no group to Start; one group to its Home; more to Your groups.
export default async function Index() {
  const user = await currentUser();
  if (!user) redirect("/login");
  await ensureUser(user);
  const groups = await listMyGroups(user.id);
  redirect(groups.length === 0 ? "/start" : groups.length === 1 ? `/groups/${groups[0].id}` : "/groups");
}
