/**
 * Screen 5, a period: Close the period, or the breakdown of the open period.
 * Route: /groups/<id>/balance/<ledgerId>?person=<userId>. Stories US7 and US8.
 *
 * Every period shows its amounts and the breakdown (Breakdown.tsx, approved 10 Nov 2026), so a
 * member can check where their amount comes from before agreeing. ?person= picks whose statement.
 *
 * For a closed period (SPEC.md rules 20 to 22, two stage settling agreed 10 Nov 2026):
 * - before everyone agrees: leftover items to sort (any member) or remove (their payer only),
 *   categories without a rule, the amounts as they stand, who has agreed, and Agree, which opens
 *   only when nothing is left to sort;
 * - once everyone agreed: the frozen amounts and when they were agreed. Payments come in step 6.
 * White, like the rest of the Balance journey (approved design, ClosePeriod2). Members only.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ItemCategoryPicker } from "@/components/ItemCategoryPicker";
import { RemoveItem } from "@/components/RemoveItem";
import { SubScreen } from "@/components/SubScreen";
import { requireUser } from "@/server/session";
import { getPeriod } from "@/server/services/periods";
import { ServiceError } from "@/server/services/errors";
import { formatCents, formatMoney } from "@/domain/money";
import { longDate } from "@/domain/dates";
import { AgreeButton } from "./AgreeButton";
import { Breakdown } from "./Breakdown";

export const dynamic = "force-dynamic";

/** The month a period belongs to, by its last day, for example "October". */
const monthName = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

export default async function ClosePeriod({ params, searchParams }: {
  params: Promise<{ groupId: string; ledgerId: string }>;
  searchParams: Promise<{ person?: string }>;
}) {
  const { groupId, ledgerId } = await params;
  const { person } = await searchParams;
  const user = await requireUser(`/groups/${groupId}/balance/${ledgerId}`);
  const p = await getPeriod(user.id, ledgerId).catch((e) => {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  });
  if (p.ledger.groupId !== groupId) notFound();
  // Whose statement to show: a member chosen with ?person=, else the reader.
  const personId = p.members.some((m) => m.id === person) ? (person as string) : user.id;
  const first = (name: string) => name.split(" ")[0];
  const me = p.members.find((m) => m.id === user.id);
  const sentence = (l: (typeof p.lines)[number]) =>
    l.to === user.id ? `${first(l.fromName)} owes you` : l.from === user.id ? `You owe ${first(l.toName)}` : `${first(l.fromName)} owes ${first(l.toName)}`;

  // The return draws the status banner, leftovers, the amounts, who agreed, and Agree.
  return (
    <SubScreen groupId={groupId} tab="balance" backHref={`/groups/${groupId}/balance`} backLabel="Back to balance" title={monthName(p.ledger.endsOn)}>
      <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${p.stage === "closed" ? "bg-orange-tint" : p.stage === "open" ? "bg-paper" : "bg-green-tint text-green"}`}>
        {p.stage === "open"
          ? `Open until ${longDate(p.ledger.endsOn)}. Amounts change as receipts come in.`
          : p.stage === "closed"
            ? `Closed on ${longDate(p.ledger.endsOn)}. No new receipts.`
            : "Everyone agreed. These amounts are final."}
      </p>

      {(p.unsorted.length > 0 || p.noRule.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="mx-1 text-xs font-bold tracking-[1.4px] text-grey-600">LEFT TO SORT</h2>
          {p.noRule.map((c) => (
            <Link key={c.id} href={`/groups/${groupId}/categories/${c.id}?from=${encodeURIComponent(`/groups/${groupId}/balance/${p.ledger.id}`)}`} className="flex min-h-14 items-center gap-3 rounded-2xl bg-ink px-4 text-paper no-underline">
              <span className="flex-1 font-extrabold">{c.name} needs a rule</span>
              <span className="text-orange"><Icon name="arrow" size={20} strokeWidth={2.5} /></span>
            </Link>
          ))}
          {p.unsorted.length > 0 && (
            <ul className="rounded-2xl border border-grey-100 px-4">
              {p.unsorted.map((i) => (
                <li key={i.id} className="flex flex-col gap-2 border-b border-grey-100 py-3 last:border-0">
                  <div className="flex items-baseline gap-2">
                    <span className="flex-1 font-bold">{i.name}</span>
                    <span className="font-extrabold tabular-nums">{formatMoney(i.priceCents, p.currency)}</span>
                  </div>
                  <span className="text-[13px] text-grey-600">{i.storeName ?? "Receipt"}</span>
                  <div className="flex flex-wrap items-start gap-2">
                    <ItemCategoryPicker groupId={groupId} itemId={i.id} itemName={i.name} categoryId={null} categories={p.categories} tone="light" />
                    {i.payerId === user.id && <RemoveItem itemId={i.id} itemName={i.name} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <span className="px-1 text-[15px] font-semibold text-grey-700">{p.myNet > 0 ? "You are owed" : p.myNet < 0 ? "You owe" : "You are all square"}</span>
        <span className="px-1 text-4xl font-extrabold tabular-nums">{formatMoney(Math.abs(p.myNet), p.currency)}</span>
        {p.lines.length > 0 && (
          <ul className="mt-2 flex flex-col">
            {p.lines.map((l) => (
              <li key={`${l.from}-${l.to}`} className="flex min-h-14 items-center gap-3 border-t border-grey-100 last:border-b">
                <span className="flex-1">{sentence(l)}</span>
                <span className="text-lg font-extrabold tabular-nums">{formatCents(l.cents, p.currency)}</span>
              </li>
            ))}
          </ul>
        )}
        {p.stage === "closed" && p.unsorted.length + p.noRule.length > 0 && (
          <span className="px-1 text-[13px] text-grey-600">Amounts can still change until everything is sorted and everyone agrees.</span>
        )}
      </section>

      <Breakdown items={p.items} members={p.members} personId={personId} viewerId={user.id} currency={p.currency}
        monthLabel={monthName(p.ledger.endsOn)} basePath={`/groups/${groupId}/balance/${p.ledger.id}`} />

      {p.stage !== "open" && (
      <section className="flex flex-col gap-2">
        <h2 className="mx-1 text-xs font-bold tracking-[1.4px] text-grey-600">AGREED</h2>
        <ul className="rounded-2xl border border-grey-100 px-4">
          {p.members.map((m) => (
            <li key={m.id} className="flex min-h-12 items-center gap-3 border-b border-grey-100 last:border-0">
              <span className="flex-1 font-bold">{m.id === user.id ? `${first(m.name)} (you)` : first(m.name)}</span>
              <span className={`text-sm font-bold ${m.agreed ? "text-green" : "text-grey-600"}`}>{m.agreed ? "Agreed" : "Waiting"}</span>
            </li>
          ))}
        </ul>
      </section>
      )}

      {p.stage === "closed" && <AgreeButton ledgerId={p.ledger.id} blockedBy={p.agreeBlockedBy} agreed={Boolean(me?.agreed)} />}
      {p.stage !== "open" && <p className="px-1 text-center text-[13px] text-grey-600">The next period is already open.</p>}
    </SubScreen>
  );
}
