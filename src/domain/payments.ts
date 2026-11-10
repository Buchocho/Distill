/**
 * Payment rules: what is still owed, how much a payment can be, and when a period is settled.
 *
 * What it holds: the amounts left per pair in an agreed period, the check on a new payment, the
 * settled test, and the yearly total per pair.
 *
 * Why it matters: payments are stage 2 of settling (SPEC.md rules 22a, 24 to 26, story US9).
 * No money moves in Distill; a payment is a record both people confirm. Decided with Maduabuchi
 * on 10 Nov 2026: payments are recorded only once a period is agreed (its amounts are final);
 * part payments are allowed; a payment can never be more than what is left for that pair in that
 * period, counting payments still waiting to be confirmed, so the record can never show more paid
 * than owed; each payment is for one period. A period is settled when confirmed payments cover
 * every amount owed in it. Pure code. Tests: tests/unit/payments.test.ts
 */

import type { BalanceLine } from "./balance";

/** A payment as these rules need it. confirmed is false while waiting for the other person. */
export interface PaymentFact {
  from: string;
  to: string;
  amountCents: number;
  confirmed: boolean;
}

/** One amount owed in a period, with what has been paid against it. */
export interface DebtStatus extends BalanceLine {
  confirmedCents: number;
  pendingCents: number;
  /** Still owed after confirmed payments. */
  leftCents: number;
  /** The most a new payment can be: what is left minus payments waiting to be confirmed. */
  capCents: number;
}

/** Each amount owed in a period with its payments counted (rule 25: only confirmed ones reduce it). */
export function debtStatus(lines: readonly BalanceLine[], payments: readonly PaymentFact[]): DebtStatus[] {
  return lines.map((l) => {
    const forPair = payments.filter((p) => p.from === l.from && p.to === l.to);
    const confirmedCents = forPair.filter((p) => p.confirmed).reduce((n, p) => n + p.amountCents, 0);
    const pendingCents = forPair.filter((p) => !p.confirmed).reduce((n, p) => n + p.amountCents, 0);
    const leftCents = Math.max(0, l.cents - confirmedCents);
    return { ...l, confirmedCents, pendingCents, leftCents, capCents: Math.max(0, leftCents - pendingCents) };
  });
}

/**
 * Checks a new payment against the period's amounts owed. Returns a message, or null when it can be
 * recorded: there must be an amount owed from the payer to the receiver, and the payment must be
 * whole cents, more than zero, and no more than what is left after payments already recorded.
 */
export function checkPayment(
  payment: { from: string; to: string; amountCents: number },
  debts: readonly DebtStatus[],
): string | null {
  const debt = debts.find((d) => d.from === payment.from && d.to === payment.to);
  if (!debt) return "Nothing is owed between these two people in this period.";
  if (!Number.isInteger(payment.amountCents) || payment.amountCents <= 0) return "Enter an amount more than zero.";
  if (debt.capCents === 0) return "Everything owed here is already paid or waiting to be confirmed.";
  if (payment.amountCents > debt.capCents) return "That is more than is left to pay.";
  return null;
}

/** A period is settled when every amount owed in it is fully covered by confirmed payments (rule 22a, stage 2). */
export function isSettled(debts: readonly DebtStatus[]): boolean {
  return debts.every((d) => d.leftCents === 0);
}

/**
 * Confirmed payments per pair (payer to receiver) in a year, for the Payments screen (rule 26).
 * Payments carry their date as YYYY-MM-DD.
 */
export function yearTotals(payments: readonly (PaymentFact & { paidOn: string })[], year: number) {
  const totals = new Map<string, { from: string; to: string; cents: number }>();
  for (const p of payments) {
    if (!p.confirmed || !p.paidOn.startsWith(`${year}-`)) continue;
    const key = `${p.from}>${p.to}`;
    const t = totals.get(key) ?? { from: p.from, to: p.to, cents: 0 };
    t.cents += p.amountCents;
    totals.set(key, t);
  }
  return [...totals.values()].sort((a, b) => b.cents - a.cents);
}
