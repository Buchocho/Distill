/**
 * Screen 1, New group. Route: /groups/new. Stories US1 and US6.
 * The form itself is in NewGroupForm.tsx; saving is in src/app/actions.ts (createGroupAction).
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { NewGroupForm } from "./NewGroupForm";
import { listMyGroups } from "@/server/services/groups";

/**
 * Back goes where the person came from: Your groups when they are already in a group, otherwise
 * Start (rule 3b; found by Maduabuchi on 10 Nov 2026, Back used to open the first group's Home).
 */
export default async function NewGroup() {
  const user = await requireUser("/groups/new");
  const back = (await listMyGroups(user.id)).length > 0 ? "/groups" : "/start";
  return (
    <main className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href={back} aria-label="Back" className="grid size-11 place-items-center rounded-xl text-ink"><Icon name="back" size={22} /></Link>
        <h1 className="text-xl font-extrabold">New group</h1>
      </header>
      <NewGroupForm />
    </main>
  );
}
