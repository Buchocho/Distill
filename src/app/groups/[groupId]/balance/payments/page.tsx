/**
 * Payments screen, inside the Balance tab. Route: /groups/<id>/balance/payments. Story US9,
 * SPEC.md rule 26 (approved design Payments3, 10 Nov 2026).
 *
 * Payments waiting for the reader to confirm, with Confirm and Decline, so they need not open each
 * period; every payment in the group newest first with its status, including cancelled and
 * declined ones so a payment never just disappears (rule 25, 10 Nov 2026); and confirmed totals per pair
 * for this year. Payments are recorded from the agreed period, by the person who paid (rule 24), so
 * there is no Record button here. Members only.
 */

import { notFound } from "next/navigation";
import { SubScreen } from "@/components/SubScreen";
import { requireUser } from "@/server/session";
import { listPayments } from "@/server/services/payments";
import { ServiceError } from "@/server/services/errors";
import { formatCents } from "@/domain/money";
import { longDate } from "@/domain/dates";
import { periodLabel } from "@/domain/periods";
import { PaymentActions } from "./PaymentActions";

export const dynamic = "force-dynamic";


export default async function Payments({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/balance/payments`);
  const data = await listPayments(user.id, groupId).catch((e) => {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  });
  const first = (name: string) => name.split(" ")[0];
  const who = (id: string, name: string) => (id === user.id ? "You" : first(name));
  const whom = (id: string, name: string) => (id === user.id ? "you" : first(name));
  const forMe = data.payments.filter((p) => p.status === "waiting" && p.to === user.id);
  /** The status pill: confirmed, waiting for someone, or who cancelled or declined it. */
  const pill = (p: (typeof data.payments)[number]) =>
    p.status === "confirmed" ? { text: "Confirmed by both", cls: "bg-green text-white" }
    : p.status === "waiting" ? { text: `Waiting for ${whom(p.to, p.toName)}`, cls: "bg-grey-100 text-ink" }
    : p.status === "declined" ? { text: `Declined by ${whom(p.to, p.toName)}`, cls: "bg-red text-white" }
    : { text: `Cancelled by ${whom(p.from, p.fromName)}`, cls: "bg-grey-100 text-grey-600" };

  /** One payment: who paid whom, amount, date and period, status, and the reader's buttons. */
  const Row = ({ p }: { p: (typeof data.payments)[number] }) => (
    <li className="flex flex-col gap-2 border-b border-grey-100 py-3">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 font-bold">{who(p.from, p.fromName)} paid {whom(p.to, p.toName)}</span>
        <span className={`text-lg font-extrabold tabular-nums ${p.status === "declined" || p.status === "cancelled" ? "text-grey-600 line-through" : ""}`}>{formatCents(p.amountCents, data.currency)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[13px] text-grey-600">{longDate(p.paidOn)} · for {periodLabel(p.startsOn, p.endsOn, data.year)}</span>
        <span className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold ${pill(p).cls}`}>{pill(p).text}</span>
      </div>
      {p.status === "waiting" && p.to === user.id && (
        <PaymentActions paymentId={p.id} canConfirm confirmLabel={`Confirm I received ${formatCents(p.amountCents, data.currency)}`} />
      )}
      {p.status === "waiting" && p.from === user.id && <PaymentActions paymentId={p.id} canConfirm={false} confirmLabel="" />}
    </li>
  );

  // The return draws payments waiting for the reader, all payments, and this year's totals.
  return (
    <SubScreen groupId={groupId} tab="balance" backHref={`/groups/${groupId}/balance`} backLabel="Back to balance" title="Payments">
      <p className="px-1 text-[13px] text-grey-600">No money moves in the app. The person who paid records it from the period. It counts once the other person confirms.</p>

      {forMe.length > 0 && (
        <section aria-labelledby="for-me" className="flex flex-col gap-2">
          <h2 id="for-me" className="mx-1 text-xs font-bold tracking-[1.4px] text-grey-600">WAITING FOR YOU</h2>
          <ul className="border-t border-grey-100">{forMe.map((p) => <Row key={p.id} p={p} />)}</ul>
        </section>
      )}

      <section aria-labelledby="history" className="flex flex-col gap-2">
        <h2 id="history" className="mx-1 mt-2 text-xs font-bold tracking-[1.4px] text-grey-600">ALL PAYMENTS</h2>
        {data.payments.length === 0 ? (
          <p className="rounded-2xl bg-grey-100 px-4 py-3 text-sm">No payments recorded yet. Once everyone agrees a past period, record what you paid from that period.</p>
        ) : (
          <ul className="border-t border-grey-100">{data.payments.filter((p) => !forMe.includes(p)).map((p) => <Row key={p.id} p={p} />)}</ul>
        )}
      </section>

      {data.totals.length > 0 && (
        <section aria-labelledby="year" className="flex flex-col gap-2">
          <h2 id="year" className="mx-1 mt-2 text-xs font-bold tracking-[1.4px] text-grey-600">CONFIRMED IN {data.year}</h2>
          <ul className="rounded-2xl border border-grey-100 px-4">
            {data.totals.map((t) => (
              <li key={`${t.from}-${t.to}`} className="flex min-h-12 items-center gap-3 border-b border-grey-100 last:border-0">
                <span className="flex-1">{who(t.from, t.fromName)} to {whom(t.to, t.toName)}</span>
                <span className="font-extrabold tabular-nums">{formatCents(t.cents, data.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SubScreen>
  );
}
