import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";
import { listMyGroups } from "@/server/services/groups";

export const dynamic = "force-dynamic";

// Entry point: signed out goes to sign in; no group goes to Start; otherwise Home of the first group.
export default async function Index() {
  const user = await currentUser();
  if (!user) redirect("/login");
  await ensureUser(user);
  const groups = await listMyGroups(user.id);
  redirect(groups.length > 0 ? `/groups/${groups[0].id}` : "/start");
}
