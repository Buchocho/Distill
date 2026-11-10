/**
 * Screen 5, Balance tab. Route: /groups/<id>/balance. Open period balance (step 3).
 * The person's own position in large type, who owes whom (netted to one line per pair), the
 * period's close date and receipt count, and what is left out of the balance with a link to sort
 * it (SPEC.md rules 15 to 17). White (approved design, BalanceWhite).
 * Below, one card per closed period not yet settled, leading to Close the period (step 5).
 * PARTLY BUILT: Payments come in step 6.
 */

import Link from "next/link";
import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { getOpenBalance } from "@/server/services/balance";
import { listClosedPeriods } from "@/server/services/periods";
import { Icon } from "@/components/Icon";
import { formatCents, formatMoney } from "@/domain/money";
import { longDate } from "@/domain/dates";

export const dynamic = "force-dynamic";

export default async function Balance({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/balance`);
  await groupOr404(user.id, groupId);
  const b = await getOpenBalance(user.id, groupId);
  const closed = await listClosedPeriods(user.id, groupId);
  const monthOf = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const month = b.openLedger
    ? new Date(`${b.openLedger.endsOn}T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" }).toUpperCase()
    : "";
  const title = b.myNet > 0 ? "You are owed" : b.myNet < 0 ? "You owe" : "You are all square";
  const leftOut = b.unsortedCount + b.noRuleCount;
  const first = (name: string) => name.split(" ")[0];

  /** One balance line in words, from the reader's point of view: "Izu owes you", "You owe Izu", "Izu owes Sam". */
  const sentence = (l: (typeof b.lines)[number]) =>
    l.to === user.id ? `${first(l.fromName)} owes you` : l.from === user.id ? `You owe ${first(l.toName)}` : `${first(l.fromName)} owes ${first(l.toName)}`;

  // The return draws the big number, the period line, the debts, and the left out card.
  return (
    <TabScreen groupId={groupId} tab="balance" label={month ? `BALANCE · ${month}` : "BALANCE"} title={title}>
      <div className="flex flex-col gap-1.5 px-1">
        <span className="text-5xl font-extrabold leading-none tracking-tight tabular-nums">{formatMoney(Math.abs(b.myNet), b.currency)}</span>
        {b.openLedger && (
          <span className="mt-2 text-[13px] text-grey-600">
            Open · closes on {longDate(b.openLedger.endsOn)} · {b.receiptCount} receipt{b.receiptCount === 1 ? "" : "s"} so far
          </span>
        )}
      </div>

      {b.lines.length === 0 ? (
        <p className="border-y border-grey-100 py-4 text-[15px] text-grey-700">
          {b.receiptCount === 0 ? "No receipts saved in this period yet." : "Nobody owes anyone anything so far."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {b.lines.map((l) => {
            const other = l.to === user.id ? l.fromName : l.toName;
            return (
              <li key={`${l.from}-${l.to}`} className="flex min-h-[60px] items-center gap-3 border-t border-grey-100 last:border-b">
                <span aria-hidden="true" className="grid size-[34px] place-items-center rounded-full bg-ink text-[13px] font-extrabold text-paper">{other[0]}</span>
                <span className="flex-1">{sentence(l)}</span>
                <span className="text-lg font-extrabold tabular-nums">{formatCents(l.cents, b.currency)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {leftOut > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-orange-tint px-4 py-3.5">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-extrabold">Not in the balance yet</span>
            <span className="text-[13px]">
              {[
                b.unsortedCount > 0 ? `${b.unsortedCount} unsorted item${b.unsortedCount === 1 ? "" : "s"}` : null,
                b.noRuleCount > 0 ? `${b.noRuleCount} item${b.noRuleCount === 1 ? "" : "s"} without a rule` : null,
              ].filter(Boolean).join(" · ")}
            </span>
          </div>
          <Link href={`/groups/${groupId}/categories/sort`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-paper no-underline">Sort</Link>
        </div>
      )}

      {closed.map((c) => (
        <Link key={c.id} href={`/groups/${groupId}/balance/${c.id}`}
          className="flex min-h-[68px] items-center gap-3 rounded-2xl border-[1.5px] border-ink px-4 text-ink no-underline">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-extrabold">{monthOf(c.endsOn)} {c.stage === "agreed" ? "is agreed" : "is closed"}</span>
            <span className="text-[13px] text-grey-600">
              {c.stage === "agreed"
                ? "Everyone agreed. Payments come next."
                : c.iAgreed
                  ? `You agreed. Waiting for ${c.memberCount - c.agreedCount} more.`
                  : "Check your amount and agree"}
            </span>
          </div>
          <Icon name="arrow" size={20} strokeWidth={2.5} />
        </Link>
      ))}
    </TabScreen>
  );
}
