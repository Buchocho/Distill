/**
 * Your groups. Route: /groups. SPEC.md rule 3b (added 10 Nov 2026), story US1.
 * A person can belong to several groups (flatmates and family, for example). After sign in,
 * someone in two or more groups lands here and picks one; someone in one group goes straight to
 * its Home. Also opened by tapping the group name on Home, to switch. Create a group is here;
 * joining another group is through its invite link. Shows the signed in account, with Sign out.
 * A group the person left stays listed, marked Settle up, until what they owe is settled (rule 2e).
 */

import Link from "next/link";
import { DistillMark } from "@/components/DistillMark";
import { Icon } from "@/components/Icon";
import { SignOutButton } from "@/components/SignOutButton";
import { requireUser } from "@/server/session";
import { myGroupsOverview } from "@/server/services/groups";
import { longDate } from "@/domain/dates";

export const dynamic = "force-dynamic";

export default async function YourGroups() {
  const user = await requireUser("/groups");
  const groups = await myGroupsOverview(user.id);

  // The return draws the list of groups, Create a group, the invite link hint and Sign out.
  return (
    <main className="flex min-h-dvh flex-col gap-4 bg-ink px-5 pb-8 pt-5 text-paper">
      <DistillMark tone="dark" />
      <h1 className="mt-2 text-[26px] font-extrabold tracking-tight">Your groups</h1>
      {groups.length === 0 ? (
        <p className="rounded-2xl bg-dark-card p-4 text-sand">You are not in a group yet. Create one, or open an invite link someone sent you.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`} className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-dark-card px-4 py-3 text-paper no-underline">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-lg font-extrabold">{g.name}</span>
                  <span className="truncate text-[13px] text-sand">{g.leftOn ? `You left on ${longDate(g.leftOn)}` : g.members.join(", ")}</span>
                </span>
                {g.leftOn && <span className="inline-flex h-[26px] shrink-0 items-center rounded-full bg-orange px-2.5 text-xs font-bold text-ink">Settle up</span>}
                <span className="text-orange"><Icon name="arrow" size={20} strokeWidth={2.5} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/groups/new" className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-orange text-base font-extrabold text-ink no-underline">
        <Icon name="plus" size={18} strokeWidth={2.5} />Create a group
      </Link>
      <p className="px-1 text-sm text-sand">To join another group, open the invite link its members sent you.</p>
      <span className="flex-1" />
      <SignOutButton email={user.email} tone="dark" />
    </main>
  );
}
