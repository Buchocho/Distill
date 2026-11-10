/**
 * Screen 5, Balance tab. Route: /groups/<id>/balance. Open period balance (step 3).
 * The person's own position in large type, who owes whom (netted to one line per pair), the
 * period's close date and receipt count, and what is left out of the balance with a link to sort
 * it (SPEC.md rules 15 to 17). White (approved design, BalanceWhite).
 * "See the breakdown" opens the open period's category by category statement, and Past periods
 * lists every closed period with the reader's amount and status (approved 10 Nov 2026).
 * Payments opens the Payments screen, with a count of payments waiting for the reader to confirm
 * (step 6, story US9, SPEC.md rules 24 to 26).
 */

import Link from "next/link";
import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { getOpenBalance } from "@/server/services/balance";
import { listClosedPeriods } from "@/server/services/periods";
import { countToConfirm } from "@/server/services/payments";
import { Icon } from "@/components/Icon";
import { formatCents, formatMoney } from "@/domain/money";
import { longDate } from "@/domain/dates";
import { periodLabel, positionWords } from "@/domain/periods";
import { requestToday } from "@/server/services/periodClock";

export const dynamic = "force-dynamic";

export default async function Balance({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/balance`);
  const { group, me } = await groupOr404(user.id, groupId);
  const b = await getOpenBalance(user.id, groupId);
  const closed = await listClosedPeriods(user.id, groupId);
  const toConfirm = await countToConfirm(user.id, groupId);
  const showPayments = toConfirm > 0 || closed.some((c) => c.stage !== "closed");
  // Periods are named from their dates ("October", "4–10 Nov"), with the device's year (rule 2c).
  const thisYear = Number((await requestToday()).slice(0, 4));
  const month = b.openLedger
    ? periodLabel(b.openLedger.startsOn, b.openLedger.endsOn, thisYear).toUpperCase()
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
      {me.leftOn && (
        <p className="rounded-2xl bg-red-tint px-4 py-3 text-sm font-bold text-red">
          You left {group.name} on {longDate(me.leftOn)}. Agree and settle what is left, then this group leaves your list.
        </p>
      )}
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

      {b.openLedger && (
        <Link href={`/groups/${groupId}/balance/${b.openLedger.id}`} className="inline-flex min-h-10 self-start items-center px-1 text-[15px] font-bold text-ink underline underline-offset-2">
          See the breakdown
        </Link>
      )}

      {showPayments && (
        <Link href={`/groups/${groupId}/balance/payments`} className="flex min-h-14 items-center gap-3 rounded-2xl border border-grey-100 px-4 text-ink no-underline">
          <span className="flex-1 font-extrabold">Payments</span>
          {toConfirm > 0 && (
            <span className="inline-flex h-[26px] items-center rounded-full bg-orange px-2.5 text-xs font-bold text-ink">{toConfirm} to confirm</span>
          )}
          <Icon name="arrow" size={18} strokeWidth={2.5} />
        </Link>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="past" className="flex flex-col gap-2">
          <h2 id="past" className="mx-1 mt-2 text-xs font-bold tracking-[1.4px] text-grey-600">PAST PERIODS</h2>
          <ul className="border-t border-grey-100">
            {closed.map((c) => {
              const pill =
                c.stage === "settled" ? { text: "Settled", cls: "bg-green text-white" }
                : c.stage === "agreed" ? { text: "Agreed", cls: "bg-grey-100 text-ink" }
                : c.iAgreed ? { text: "Waiting", cls: "bg-grey-100 text-ink" }
                : { text: "Agree", cls: "bg-orange text-ink" };
              // Settled periods are past: "You were owed", not "You are owed" (rule 22a).
              const amount = c.myNet === 0 ? (c.stage === "settled" ? "Were all square" : "All square") : `${positionWords(c.myNet, c.stage)} ${formatMoney(Math.abs(c.myNet), b.currency)}`;
              return (
                <li key={c.id}>
                  <Link href={`/groups/${groupId}/balance/${c.id}`} className="flex min-h-16 items-center gap-3 border-b border-grey-100 text-ink no-underline">
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="font-bold">{periodLabel(c.startsOn, c.endsOn, thisYear)}</span>
                      <span className="text-[13px] text-grey-600">{amount}</span>
                    </span>
                    <span className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold ${pill.cls}`}>{pill.text}</span>
                    <Icon name="arrow" size={18} strokeWidth={2.5} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </TabScreen>
  );
}
