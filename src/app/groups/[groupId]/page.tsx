/**
 * Screen 0c, Home. Route: /groups/<id>. The landing page of a group, outside the tabs.
 * The group name at the top, large, with its arrow, opens Your groups, to switch group or create
 * another (rule 3b); the period is on the line under it (approved design Home header, 10 Nov 2026).
 * Three stacked sections, dark to light, each opening its tab: Receipts, Categories, Balance
 * (approved design, canvas "Distill screens" page v2). No amounts are shown on Home by design.
 * The status lines are live: Receipts says what is waiting (SPEC.md rule 9); Categories says how
 * many items need sorting (rules 12 and 17), the same count as the flag on the Categories tab;
 * Balance says the most pressing thing waiting for the reader (a payment to confirm, a declined
 * payment, a period to agree, a payment to record), and only otherwise when the period closes
 * (src/domain/home.ts, decided 10 Nov 2026), counted with the device's date (rule 2c).
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { DistillMark } from "@/components/DistillMark";
import { CartFigure, ScaleFigure, TagFigure } from "@/components/Figures";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { balanceLine, needsAction } from "@/domain/home";
import { periodLabel } from "@/domain/periods";
import { requestToday } from "@/server/services/periodClock";
import { listReceipts } from "@/server/services/receipts";
import { countToSort } from "@/server/services/categories";
import { balanceSituation } from "@/server/services/payments";

export const dynamic = "force-dynamic";

// Home: three sections, dark to light, each leading to its tab. No amounts are shown here.
export default async function Home({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}`);
  const { group, openLedger, me } = await groupOr404(user.id, groupId);
  // Someone who left only has settling left to do, so they go straight to Balance (rule 2e).
  if (me.leftOn) redirect(`/groups/${groupId}/balance`);
  const first = user.name.split(" ")[0];
  const recent = await listReceipts(user.id, groupId);
  const toSort = await countToSort(user.id, groupId);
  const toReview = recent.filter((r) => r.status === "ready").length;
  const unsorted = recent.filter((r) => r.status === "saved").reduce((n, r) => n + r.unsortedCount, 0);
  const receiptsLine =
    recent.length === 0 ? "No receipts yet"
    : toReview > 0 ? `${toReview} receipt${toReview === 1 ? "" : "s"} to review`
    : unsorted > 0 ? `${unsorted} item${unsorted === 1 ? "" : "s"} without a category`
    : "All receipts sorted";
  const situation = await balanceSituation(user.id, groupId);
  const balanceText = balanceLine(situation);
  const balanceUrgent = needsAction(situation);
  // The open period's name from its dates ("November", "4–10 Nov"), with the device's year.
  const month = openLedger ? periodLabel(openLedger.startsOn, openLedger.endsOn, Number((await requestToday()).slice(0, 4))) : "";
  const pill = "mt-1.5 inline-flex h-10 items-center gap-2 self-start rounded-full px-4 text-sm font-extrabold";
  const section = "relative flex min-h-[230px] flex-1 overflow-hidden rounded-t-[28px] pb-11 pl-5 pr-4 pt-5 no-underline";

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="flex items-start gap-3 px-5 pb-2 pt-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <DistillMark tone="dark" />
          <Link href="/groups" aria-label={`${group.name}. Switch group`}
            className="line-clamp-2 min-h-11 text-xl font-extrabold leading-tight tracking-tight text-paper no-underline">
            {group.name}
            <span className="ml-1.5 inline-block align-[-2px]"><Icon name="chevron" size={18} strokeWidth={3} /></span>
          </Link>
          {month && <span className="text-[13px] text-sand">Period {month}</span>}
        </div>
        <Link href={`/groups/${groupId}/invite`} aria-label="Group: members, invite link and settings"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-[15px] font-extrabold text-ink no-underline">
          {first[0]}
        </Link>
      </header>
      <h1 className="mx-5 mb-4 mt-1 text-[26px] font-extrabold tracking-tight">Hello, {first}</h1>

      <Link href={`/groups/${groupId}/receipts`} className={`${section} bg-dark text-paper`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px] text-sand">RECEIPTS</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">Bought something?<br />Scan it.</span>
          <span className="text-[13px] text-sand">{receiptsLine}</span>
          <span className={`${pill} bg-orange text-ink`}><Icon name="camera" size={18} strokeWidth={2.2} />Scan receipt</span>
        </div>
        <CartFigure />
      </Link>

      <Link href={`/groups/${groupId}/categories`} className={`${section} -mt-7 bg-orange text-ink shadow-[0_-10px_30px_rgba(0,0,0,0.25)]`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px]">CATEGORIES</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">Who shares<br />what</span>
          <span className="text-[13px] font-semibold">{toSort > 0 ? `${toSort} item${toSort === 1 ? " needs" : "s need"} sorting` : recent.length === 0 ? "Categories appear as receipts come in" : "Everything is sorted"}</span>
          <span className={`${pill} bg-ink text-paper`}>See categories<Icon name="arrow" size={16} strokeWidth={2.5} /></span>
        </div>
        <TagFigure />
      </Link>

      <Link href={`/groups/${groupId}/balance`} className={`${section} -mt-7 bg-white pb-7 text-ink shadow-[0_-10px_30px_rgba(0,0,0,0.18)]`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px] text-grey-600">BALANCE</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">The group&apos;s<br />balance</span>
          {balanceText && (
            <span className={`text-[13px] ${balanceUrgent ? "font-bold text-orange-text" : "text-grey-600"}`}>{balanceText}</span>
          )}
          <span className={`${pill} bg-ink text-paper`}>
            <span aria-hidden="true" className="grid size-[22px] rotate-[14deg] place-items-center rounded-full bg-orange text-sm font-extrabold text-ink">€</span>
            Check balance
          </span>
        </div>
        <ScaleFigure />
      </Link>
    </main>
  );
}
