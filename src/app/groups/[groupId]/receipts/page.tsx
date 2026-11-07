/**
 * Screen 2, Receipts tab. Route: /groups/<id>/receipts. Story US2.
 * Scan a receipt (ScanPanel.tsx) and see the group's recent receipts with their status: being read,
 * waiting for review, items still unsorted, or all sorted (approved design, ReceiptsDark).
 * Amounts are shown in the group's currency (SPEC.md rule 2b).
 */

import Link from "next/link";
import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { listReceipts } from "@/server/services/receipts";
import { formatCents } from "@/domain/money";
import { receiptStatus } from "@/domain/receipts";
import { ScanPanel } from "./ScanPanel";

export const dynamic = "force-dynamic";

/** Colours for the status pill, one meaning each: orange act here, green done, grey waiting, red error. */
const TONE = {
  act: "bg-orange text-ink",
  done: "bg-green text-paper",
  wait: "bg-dark-line text-paper",
  error: "bg-red text-paper",
} as const;

/** "10 Sep" from a YYYY-MM-DD date, or from the moment it was added when no date was read. */
function shortDate(iso: string | null, added: Date): string {
  const d = iso ? new Date(`${iso}T00:00:00Z`) : added;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function Receipts({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/receipts`);
  const { group, members } = await groupOr404(user.id, groupId);
  const list = await listReceipts(user.id, groupId);

  // The return draws the scan panel, then the recent receipts, or an empty state when there are none.
  return (
    <TabScreen groupId={groupId} tab="receipts" label="RECEIPTS" title={group.name}
      action={<Link href={`/groups/${groupId}/invite`} className="mt-1 min-h-11 rounded-full px-3 py-2.5 text-sm font-bold text-orange">Invite</Link>}>
      <ScanPanel groupId={groupId} members={members} me={user.id} />

      <h2 className="mx-1 mt-1 text-xs font-bold tracking-[1.4px] text-sand">RECENT</h2>
      {list.length === 0 ? (
        <div className="rounded-2xl bg-dark-card p-5 text-center">
          <p className="font-bold">No receipts yet</p>
          <p className="mt-1 text-sm text-sand">Take a photo of your next shop. It will be listed here.</p>
        </div>
      ) : (
        <ul className="rounded-2xl bg-dark-card px-4">
          {list.map((r) => {
            const s = receiptStatus(r.status, r.unsortedCount);
            return (
              <li key={r.id} className="border-b border-dark-line last:border-0">
                <Link href={`/groups/${groupId}/receipts/${r.id}`} className="flex min-h-[72px] items-center gap-3 text-paper no-underline">
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-bold">{r.storeName ?? "Receipt"}</span>
                    <span className="text-[13px] text-sand">{shortDate(r.purchaseDate, r.createdAt)} · Paid by {r.paidByName.split(" ")[0]}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {r.totalCents !== null && <span className="font-extrabold tabular-nums">{formatCents(r.totalCents, group.currency)}</span>}
                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold ${TONE[s.tone]}`}>{s.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </TabScreen>
  );
}
