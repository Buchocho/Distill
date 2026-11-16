/**
 * Group screen. Route: /groups/<id>/invite. Story US1.
 * Ink header with rounded bottom corners showing the group name, avatar stack and period;
 * paper body with the invite card, member list, settings (name, close date), and leave/sign-out.
 * Shows the group's invite link with Share and Copy, and the member list with each member's
 * Google email under their name, so the group can tell which account joined (SPEC.md rule 2a).
 * Remove next to each other member and Leave at the bottom (rule 2e).
 * People who left are listed last in grey with when, and who removed them.
 * Someone who left does not see the invite link.
 * Also where a person changes the name they are shown as (DisplayNameForm, rule 1) and
 * where the group changes when accounts close (CloseRuleForm, rule 18), and Sign out (rule 1a).
 * Approved design: canvas "Group.dc.html", 16 Nov 2026.
 */

import Link from "next/link";
import { headers } from "next/headers";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { periodLabel } from "@/domain/periods";
import { requestToday } from "@/server/services/periodClock";
import { InviteCard } from "./InviteCard";
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
  const activeMemberCount = members.filter((m) => m.leftOn === null).length;
  /** "Left on 2 Nov" or "Removed by Izu on 2 Nov", for someone no longer in the group. */
  const leftText = (m: (typeof members)[number]) =>
    m.removedBy
      ? `Removed by ${m.removedBy === user.id ? "you" : first(members.find((x) => x.id === m.removedBy)?.name ?? "someone")} on ${longDate(m.leftOn ?? "")}`
      : `Left on ${longDate(m.leftOn ?? "")}`;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const month = openLedger ? periodLabel(openLedger.startsOn, openLedger.endsOn, Number((await requestToday()).slice(0, 4))) : "";
  // Avatar colours cycle through these so each member gets a distinct circle in the header stack.
  const avatarBg = ["bg-orange", "bg-paper", "bg-sand"];

  return (
    <main className="flex min-h-dvh flex-col bg-paper text-ink">

      {/* Ink header with rounded bottom corners */}
      <div className="rounded-b-[28px] bg-ink px-4 pb-5 pt-3.5 text-paper">
        <div className="flex items-center gap-1.5">
          <Link href={isNew ? "/groups" : `/groups/${groupId}`} aria-label={isNew ? "Back to your groups" : "Back to Home"}
            className="grid size-11 place-items-center rounded-xl text-paper no-underline">
            <Icon name="back" size={22} />
          </Link>
          <span className="text-[11px] font-extrabold tracking-[1.4px] text-sand">GROUP</span>
        </div>
        <div className="flex flex-col gap-2.5 px-1.5 pt-3">
          <h1 className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {isNew ? "Group created" : group.name}
          </h1>
          <div className="flex items-center gap-2.5">
            {/* Avatar stack: overlapping circles with member initials */}
            <span className="flex">
              {listed.filter((m) => m.leftOn === null).slice(0, 5).map((m, i) => (
                <span key={m.id}
                  className={`flex size-7 items-center justify-center rounded-full border-2 border-ink text-xs font-extrabold text-ink ${avatarBg[i % avatarBg.length]}${i > 0 ? " -ml-2.5" : ""}`}>
                  {m.name[0]}
                </span>
              ))}
            </span>
            <span className="text-[13px] text-sand">
              {activeMemberCount} member{activeMemberCount === 1 ? "" : "s"}
              {month ? <> &middot; Period {month}</> : null}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-[18px] px-4 pb-6 pt-4">

        {/* Invite card or left notice */}
        {current ? (
          <InviteCard url={`${origin}/join/${group.inviteToken}`} groupName={group.name} />
        ) : (
          <p className="rounded-2xl bg-red-tint px-4 py-3 text-sm font-bold text-red">
            You left {group.name} on {longDate(me.leftOn ?? "")}. You can still agree and settle what is left on the Balance tab.
          </p>
        )}

        {/* Members */}
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[11px] font-extrabold tracking-[1.4px] text-grey-600">MEMBERS</span>
          <div className="rounded-[18px] bg-white px-3.5">
            {listed.map((m, i) => (
              <div key={m.id} className={`flex min-h-[60px] items-center gap-[11px]${i > 0 ? " border-t border-grey-100" : ""}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${m.leftOn ? "bg-grey-200 text-grey-600" : "bg-ink text-paper"}`}>
                  {m.name[0]}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-[15px] font-bold ${m.leftOn ? "text-grey-600" : ""}`}>{m.name}</span>
                  {m.leftOn ? (
                    <span className="text-xs text-grey-600">{leftText(m)}</span>
                  ) : (
                    <span className="truncate text-xs text-grey-600">{m.email}</span>
                  )}
                </span>
                {m.id === user.id && m.leftOn === null && (
                  <span className="rounded-full bg-grey-100 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.6px] text-grey-700">YOU</span>
                )}
                {m.id !== user.id && m.leftOn === null && current && (
                  <RemoveMember groupId={groupId} userId={m.id} name={first(m.name)} groupName={group.name} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[11px] font-extrabold tracking-[1.4px] text-grey-600">SETTINGS</span>
          <div className="rounded-[18px] bg-white px-3.5">
            <DisplayNameForm current={user.name} />
            <div className="border-t border-grey-100" />
            <CloseRuleForm groupId={groupId} rule={group.closeRule} day={group.closeDay}
              currentEnd={openLedger ? longDate(openLedger.endsOn) : null} currentStart={openLedger?.startsOn ?? null}
              changedBy={group.closeRuleChangedBy ? (members.find((m) => m.id === group.closeRuleChangedBy)?.name.split(" ")[0] ?? null) : null}
              changedOn={group.closeRuleChangedAt ? longDate(group.closeRuleChangedAt.toISOString().slice(0, 10)) : null} />
          </div>
        </div>

        {/* Leave and sign out, set apart at the bottom */}
        <div className="mt-auto flex items-center gap-2.5 border-t border-grey-200 pt-3">
          {current && <LeaveGroup groupId={groupId} userId={user.id} groupName={group.name} />}
          <span className="flex-1" />
          <SignOutButton email={user.email} />
        </div>
      </div>
    </main>
  );
}
