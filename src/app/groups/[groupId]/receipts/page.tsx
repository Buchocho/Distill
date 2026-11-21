/**
 * Screen 2, Receipts tab. Route: /groups/<id>/receipts. Story US2.
 * Custom dark header with the small Distill mark, "RECEIPTS" label, group name, current period
 * and an avatar button linking to the Group screen. Below: a scan card, an "UNFINISHED" section
 * with receipts that are not finished yet, and a "RECENT" section with all receipts (payer avatar,
 * store, date, amount, status badge). Bottom tab bar.
 * The section was "NEEDS YOU" until 21 Nov 2026: it lists receipts from the whole group, and a
 * receipt in review can only be finished by the person who scanned it (SPEC.md rule 4), so each
 * row now says why the receipt is unfinished and who has to act (unfinishedRow in src/domain).
 * Amounts are shown in the group's currency (SPEC.md rule 2b).
 * Approved design: canvas "Receipts.dc.html", 16 Nov 2026.
 */

import Link from "next/link";
import { TabBar } from "@/components/TabBar";
import { DistillMark } from "@/components/DistillMark";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { listReceipts } from "@/server/services/receipts";
import { formatCents } from "@/domain/money";
import { receiptStatus, unfinishedRow } from "@/domain/receipts";
import { periodLabel } from "@/domain/periods";
import { requestToday } from "@/server/services/periodClock";
import { ScanPanel } from "./ScanPanel";

export const dynamic = "force-dynamic";

/** Badge colours: orange for action, green for done, dark-line for waiting, red for error. */
const TONE = {
  act: "bg-orange text-ink",
  done: "bg-green text-paper",
  wait: "bg-dark-line text-paper",
  error: "bg-red text-paper",
} as const;

/** "14 Nov" from a YYYY-MM-DD date, or from the creation timestamp when no date was read. */
function shortDate(iso: string | null, added: Date): string {
  const d = iso ? new Date(`${iso}T00:00:00Z`) : added;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function Receipts({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/receipts`);
  const { group, me, openLedger } = await groupOr404(user.id, groupId);
  const list = await listReceipts(user.id, groupId);
  const today = await requestToday();
  const month = openLedger ? periodLabel(openLedger.startsOn, openLedger.endsOn, Number(today.slice(0, 4))) : "";

  // Receipts not finished yet: in review, or saved with items still unsorted. Each row says why
  // and who has to act, because the list is the same for everyone in the group.
  const unfinished = list
    .filter((r) => receiptStatus(r.status, r.unsortedCount).tone === "act")
    .map((r) => ({
      r,
      row: unfinishedRow({
        status: r.status,
        unsortedCount: r.unsortedCount,
        itemsCents: r.itemsCents,
        missingPrices: r.missingPrices,
        totalCents: r.totalCents,
        isYours: r.paidBy === user.id,
        payerFirstName: r.paidByName.split(" ")[0],
        youLeft: me.leftOn !== null,
      }, group.currency),
    }));

  return (
    <main className="flex min-h-dvh flex-col bg-dark text-paper">

      {/* Custom header: small Distill mark, RECEIPTS label, group name, period, avatar button */}
      <div className="flex items-start gap-2 px-4 pb-2 pt-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <DistillMark tone="dark" href={`/groups/${groupId}`} size="sm" />
          <span className="text-[11px] font-extrabold tracking-[1.4px] text-sand">RECEIPTS</span>
          <h1 className="text-[23px] font-extrabold leading-[1.15] tracking-[-0.02em]">{group.name}</h1>
          {month && <span className="text-xs text-sand">Period {month}</span>}
        </div>
        <Link href={`/groups/${groupId}/invite`} aria-label="Group: members and settings"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-[15px] font-extrabold text-ink no-underline">
          {user.name[0]}
        </Link>
      </div>

      {/* Scrollable body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2 pt-1.5">

        {/* Scan card */}
        {me.leftOn === null ? (
          <ScanPanel groupId={groupId} />
        ) : (
          <p className="rounded-[20px] bg-dark-card p-4 text-sm text-sand">You left this group, so you cannot add receipts. You can still see them.</p>
        )}

        {/* UNFINISHED section: receipts not finished yet, with the reason and who has to act */}
        {unfinished.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-extrabold tracking-[1.4px] text-orange">UNFINISHED</span>
              <span className="rounded-full bg-orange px-[7px] py-[2px] text-[11px] font-extrabold text-ink">{unfinished.length}</span>
            </div>
            <div className="overflow-hidden rounded-[18px] bg-dark-card">
              {unfinished.map(({ r, row }, i) => (
                <div key={r.id}>
                  {i > 0 && <div className="h-px bg-dark-line" />}
                  <Link href={`/groups/${groupId}/receipts/${r.id}`}
                    className={`flex min-h-[68px] items-center gap-3 border-l-4 pr-3.5 text-paper no-underline ${row.tone === "act" ? "border-orange" : "border-dark-line"}`}>
                    <span className="flex min-w-0 flex-1 flex-col pl-3">
                      <span className="text-[15px] font-extrabold">{r.storeName ?? "Receipt"}</span>
                      <span className="text-xs text-sand">{row.reason}</span>
                    </span>
                    <span className="flex flex-col items-end gap-[5px]">
                      {r.totalCents !== null && (
                        <span className="text-[15px] font-extrabold tabular-nums">{formatCents(r.totalCents, group.currency)}</span>
                      )}
                      <span className={`rounded-full px-2 py-[3px] text-[11px] font-extrabold ${TONE[row.tone]}`}>{row.badge}</span>
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT section: all receipts */}
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[11px] font-extrabold tracking-[1.4px] text-sand">RECENT</span>
          {list.length === 0 ? (
            <div className="rounded-[18px] bg-dark-card p-5 text-center">
              <p className="font-bold">No receipts yet</p>
              <p className="mt-1 text-sm text-sand">Take a photo of your next shop. It will be listed here.</p>
            </div>
          ) : (
            <div className="rounded-[18px] bg-dark-card px-3.5">
              {list.map((r, i) => {
                const s = receiptStatus(r.status, r.unsortedCount);
                const isYou = r.paidBy === user.id;
                return (
                  <div key={r.id}>
                    {i > 0 && <div className="h-px bg-dark-line" />}
                    <Link href={`/groups/${groupId}/receipts/${r.id}`}
                      className="flex min-h-[66px] items-center gap-[11px] text-paper no-underline">
                      {/* Payer avatar */}
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-dark-line text-xs font-extrabold text-paper">
                        {r.paidByName[0]}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-bold">{r.storeName ?? "Receipt"}</span>
                        <span className="text-xs text-sand">{shortDate(r.purchaseDate, r.createdAt)} · {isYou ? "you" : r.paidByName.split(" ")[0]}</span>
                      </span>
                      <span className="flex flex-col items-end gap-[5px]">
                        {r.totalCents !== null && (
                          <span className="text-[15px] font-extrabold tabular-nums">{formatCents(r.totalCents, group.currency)}</span>
                        )}
                        <span className={`rounded-full px-2 py-[3px] text-[11px] font-extrabold ${TONE[s.tone]}`}>{s.label}</span>
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <TabBar groupId={groupId} active="receipts" />
    </main>
  );
}
