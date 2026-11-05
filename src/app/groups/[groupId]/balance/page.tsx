/**
 * Screen 5, Balance tab. Route: /groups/<id>/balance. Stories US6, US7, US8.
 * PARTLY BUILT: shows the open period's dates and days left, and each member at 0,00. Real amounts
 * come in step 3; closing, sorting leftovers and Agree in step 5; payments in step 6.
 */

import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { daysUntil } from "@/domain/ledgers";

export default async function Balance({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/balance`);
  const { openLedger, members } = await groupOr404(user.id, groupId);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <TabScreen groupId={groupId} tab="balance" label="BALANCE" title="Nothing to settle yet">
      {openLedger && (
        <p className="px-1 text-sm text-grey-600">
          Open period: {openLedger.startsOn} to {openLedger.endsOn} · closes in {daysUntil(today, openLedger.endsOn)} days
        </p>
      )}
      <ul className="flex flex-col">
        {members.map((m, i) => (
          <li key={m.id} className={`flex min-h-14 items-center gap-3 border-t border-grey-100 ${i === members.length - 1 ? "border-b" : ""}`}>
            <span className="grid size-[34px] place-items-center rounded-full bg-ink text-[13px] font-extrabold text-paper">{m.name[0]}</span>
            <span className="flex-1">{m.name}</span>
            <span className="font-extrabold tabular-nums">0,00</span>
          </li>
        ))}
      </ul>
    </TabScreen>
  );
}
