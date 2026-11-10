/**
 * The breakdown section of the period screen, approved by Maduabuchi on 10 Nov 2026 (design
 * "Period breakdown" on the Distill screens canvas). One person's month, category by category:
 * their share as the large figure, "Bought N times · total", and the split in words; tapping a
 * category lists each purchase and who paid. A switch shows the same statement for each member.
 * The totals at the bottom (paid, share, owed) match the amount at the top of the screen.
 * The numbers come from src/domain/breakdown.ts, which uses the same arithmetic as the balance.
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { computeBreakdown, type BreakdownItem } from "@/domain/breakdown";
import { formatMoney } from "@/domain/money";
import { longDate } from "@/domain/dates";

export function Breakdown({ items, members, personId, viewerId, currency, monthLabel, basePath }: {
  items: BreakdownItem[];
  members: { id: string; name: string }[];
  personId: string;
  viewerId: string;
  currency: string;
  monthLabel: string;
  basePath: string;
}) {
  const first = (id: string) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
  const b = computeBreakdown(items, personId, viewerId, members.map((m) => m.id), first);
  // The switch starts with the reader ("You"), then the others in the order they joined, so each
  // person sees their own statement first (asked by Maduabuchi, 10 Nov 2026).
  const switchOrder = [...members].sort((a, b) => Number(b.id === viewerId) - Number(a.id === viewerId));
  const mine = personId === viewerId;
  const money = (c: number) => formatMoney(c, currency);

  // The return draws the heading, the person switch, a card per category, and the totals.
  return (
    <section aria-labelledby="breakdown" className="flex flex-col gap-2.5">
      <h2 id="breakdown" className="mx-1 text-xs font-bold tracking-[1.4px] text-grey-600">{monthLabel.toUpperCase()}, CATEGORY BY CATEGORY</h2>
      {members.length > 1 && (
        <div role="group" aria-label="Show the statement for" className="flex flex-wrap gap-2">
          {switchOrder.map((m) => (
            <Link key={m.id} href={`${basePath}?person=${m.id}`} aria-current={m.id === personId ? "true" : undefined} scroll={false}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold no-underline ${m.id === personId ? "bg-ink text-white" : "border-[1.5px] border-ink text-ink"}`}>
              {m.id === viewerId ? "You" : first(m.id)}
            </Link>
          ))}
        </div>
      )}

      {b.lines.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-grey-100 p-4 text-sm text-grey-600">Nothing in the balance for this period yet.</p>
      ) : (
        b.lines.map((l) => (
          <details key={l.categoryId} className="group rounded-2xl border-[1.5px] border-grey-100 px-4">
            <summary className="flex cursor-pointer list-none flex-col gap-1 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline gap-2">
                <span className="flex-1 text-[17px] font-extrabold">{l.name}</span>
                <span className={`text-xl font-extrabold tabular-nums ${l.shareCents === 0 ? "text-grey-600" : ""}`}>{money(l.shareCents)}</span>
                <span className="inline-block transition-transform group-open:[transform:rotate(180deg)]"><Icon name="chevron" size={16} strokeWidth={2.5} /></span>
              </span>
              <span className="text-[13px] text-grey-600">Bought {l.timesBought} time{l.timesBought === 1 ? "" : "s"} · {money(l.totalCents)} in total</span>
              <span className="text-sm font-semibold">{l.splitText}</span>
            </summary>
            <ul className="pb-2">
              {l.purchases.map((p, i) => (
                <li key={i} className="flex gap-2 border-t border-grey-100 py-2.5 text-sm">
                  <span className="flex-1">
                    {longDate(p.date).replace(/ \d{4}$/, "")} · {p.storeName ?? "Receipt"} · paid by <b>{p.payerId === viewerId ? "you" : first(p.payerId)}</b>
                  </span>
                  <span className="tabular-nums">{money(p.priceCents)}</span>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}

      <div className="flex flex-col gap-1.5 rounded-2xl bg-paper px-4 py-3.5">
        <span className="flex text-[15px]"><span className="flex-1">{mine ? "You paid" : `${first(personId)} paid`}</span><b className="tabular-nums">{money(b.paidCents)}</b></span>
        <span className="flex text-[15px]"><span className="flex-1">{mine ? "Your share" : `${first(personId)}'s share`}</span><b className="tabular-nums">{money(b.shareCents)}</b></span>
        <span className="flex border-t border-grey-200 pt-1.5 font-extrabold">
          <span className="flex-1">{b.balanceCents > 0 ? (mine ? "You are owed" : `${first(personId)} is owed`) : b.balanceCents < 0 ? (mine ? "You owe" : `${first(personId)} owes`) : "All square"}</span>
          <span className={`tabular-nums ${b.balanceCents > 0 ? "text-green" : b.balanceCents < 0 ? "text-red" : ""}`}>{money(Math.abs(b.balanceCents))}</span>
        </span>
      </div>
      <p className="mx-1 text-[13px] text-grey-600">The figure on each card is {mine ? "your" : `${first(personId)}'s`} share: what that category cost {mine ? "you" : "them"} this period. Tap a category to see each purchase and who paid.</p>
    </section>
  );
}
