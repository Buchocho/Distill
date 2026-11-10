/**
 * Invite screen. Route: /groups/<id>/invite. Story US1.
 * Shows the group's invite link with Share and Copy, and the member list with each member's
 * Google email under their name, so the group can tell which account joined (SPEC.md rule 2a).
 * Remove next to each other member and Leave at the bottom (rule 2e, approved design Members);
 * people who left are listed last in grey with when, and who removed them. Opened right after a
 * group is created (title "Group created") and from the initial on Home and Group on the Receipts tab (title "Group", renamed from Invite people on 10 Nov 2026).
 * Also where a person changes the name they are shown as (DisplayNameForm, SPEC.md rule 1) and
 * where the group changes when accounts close (CloseRuleForm, rule 18), and Sign out at the bottom
 * (SignOutButton, rule 1a).
 * The link is built from the address the app is running at, so it works on any deploy.
 */

import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { CopyLink } from "./CopyLink";
import { DisplayNameForm } from "./DisplayNameForm";
import { CloseRuleForm } from "./CloseRuleForm";
import { SignOutButton } from "@/components/SignOutButton";
import { LeaveGroup, RemoveMember } from "./MemberActions";
import { longDate } from "@/domain/dates";

export default async function Invite({ params, searchParams }: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { groupId } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/groups/${groupId}/invite`);
  const { group, members, openLedger, me } = await groupOr404(user.id, groupId);
  const current = me.leftOn === null;
  const first = (name: string) => name.split(" ")[0];
  // Current members first, in the order they joined, then people who left (rule 2e).
  const listed = [...members.filter((m) => m.leftOn === null), ...members.filter((m) => m.leftOn !== null)];
  /** "Left on 2 Nov" or "Removed by Izu on 2 Nov", for someone no longer in the group. */
  const leftText = (m: (typeof members)[number]) =>
    m.removedBy
      ? `Removed by ${m.removedBy === user.id ? "you" : first(members.find((x) => x.id === m.removedBy)?.name ?? "someone")} on ${longDate(m.leftOn ?? "")}`
      : `Left on ${longDate(m.leftOn ?? "")}`;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return (
    <main className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href={`/groups/${groupId}`} aria-label="Back to Home" className="grid size-11 place-items-center rounded-xl text-ink"><Icon name="back" size={22} /></Link>
        <h1 className="text-xl font-extrabold">{isNew ? "Group created" : "Group"}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-2">
        <p className="text-[15px] text-grey-700">Send this link to the people you shop with. They sign in and join <b className="text-ink">{group.name}</b>.</p>
        <CopyLink url={`${origin}/join/${group.inviteToken}`} />
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">Members</h2>
          <ul className="rounded-2xl bg-white px-4">
            {listed.map((m, i) => (
              <li key={m.id} className={`flex min-h-14 items-center gap-3 ${i ? "border-t border-grey-200" : ""}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${m.leftOn ? "bg-grey-200 text-grey-600" : "bg-ink text-paper"}`}>{m.name[0]}</span>
                <span className="flex min-w-0 flex-1 flex-col py-2">
                  <span className={`font-semibold ${m.leftOn ? "text-grey-600" : ""}`}>{m.name}</span>
                  <span className="truncate text-[13px] text-grey-600">{m.email}</span>
                  {m.leftOn && <span className="text-[13px] text-grey-600">{leftText(m)}</span>}
                </span>
                {m.id === user.id && <span className="text-[13px] text-grey-600">You</span>}
                {m.id !== user.id && m.leftOn === null && current && (
                  <RemoveMember groupId={groupId} userId={m.id} name={first(m.name)} groupName={group.name} />
                )}
              </li>
            ))}
          </ul>
        </div>
        <DisplayNameForm current={user.name} />
        <CloseRuleForm groupId={groupId} rule={group.closeRule} day={group.closeDay}
          currentEnd={openLedger ? longDate(openLedger.endsOn) : null} currentStart={openLedger?.startsOn ?? null}
          changedBy={group.closeRuleChangedBy ? (members.find((m) => m.id === group.closeRuleChangedBy)?.name.split(" ")[0] ?? null) : null}
          changedOn={group.closeRuleChangedAt ? longDate(group.closeRuleChangedAt.toISOString().slice(0, 10)) : null} />
        <Link href={`/groups/${groupId}`} className="mt-auto flex min-h-13 items-center justify-center rounded-xl border-[1.5px] border-ink bg-white font-extrabold text-ink no-underline">Go to Home</Link>
        {current && <LeaveGroup groupId={groupId} userId={user.id} groupName={group.name} />}
        <SignOutButton email={user.email} />
      </div>
    </main>
  );
}
