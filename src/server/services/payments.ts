/**
 * Payments service: recording, confirming, declining and listing payments between members.
 *
 * What it holds: the Payments screen data (history, totals for the year), each period's payments,
 * recording a payment, confirming or declining one, and marking a period settled.
 *
 * Why it matters: this is stage 2 of settling (story US9, SPEC.md rules 22a, 24 to 26). No money
 * moves in Distill. Only the person who paid records a payment, from the agreed period's screen;
 * it counts only after the person paid confirms it (rules 24 and 25, decided 10 Nov 2026).
 * Part payments are allowed, never more than is left (src/domain/payments.ts). A confirmed payment
 * cannot change. When confirmed payments cover every amount owed in a period, it is settled and
 * becomes read only. Members only (architecture rule 4).
 */

import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ledgers, payments } from "@/server/db/schema";
import { checkPayment, debtStatus, isSettled, yearTotals } from "@/domain/payments";
import { isIsoDate } from "@/domain/receipts";
import { periodLabel, periodStage } from "@/domain/periods";
import { daysUntil } from "@/domain/ledgers";
import type { BalanceSituation } from "@/domain/home";
import { listClosedPeriods } from "./periods";
import { getGroupForMember, UUID } from "./groups";
import { ServiceError } from "./errors";
import { requestToday } from "./periodClock";

/** A payment as the rules need it. */
const fact = (p: typeof payments.$inferSelect) => ({ from: p.fromUser, to: p.toUser, amountCents: p.amountCents, confirmed: p.confirmedAt !== null });

/** What happened to a payment, for the history: confirmed, waiting, or removed by whom (rule 25). */
function statusOf(p: typeof payments.$inferSelect): "confirmed" | "waiting" | "cancelled" | "declined" {
  if (p.confirmedAt) return "confirmed";
  if (!p.removedAt) return "waiting";
  // The payer removing their own payment is a cancel; the person paid removing it is a decline.
  return p.removedBy === p.fromUser ? "cancelled" : "declined";
}

/** The amounts owed in an agreed period with what has been paid against them (removed payments do not count). */
async function periodDebts(ledger: typeof ledgers.$inferSelect) {
  const list = await db.select().from(payments).where(and(eq(payments.ledgerId, ledger.id), isNull(payments.removedAt)));
  return debtStatus(ledger.frozenLines ?? [], list.map(fact));
}

/** Marks a period settled if confirmed payments now cover everything owed in it (rule 22a, stage 2). */
async function settleIfPaid(ledgerId: string) {
  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.id, ledgerId));
  if (!ledger || periodStage(ledger) !== "agreed") return;
  if (isSettled(await periodDebts(ledger))) {
    await db.update(ledgers).set({ settledAt: new Date() }).where(and(eq(ledgers.id, ledgerId), isNull(ledgers.settledAt)));
  }
}

/**
 * Everything the Payments screen needs (rule 26): every payment in the group, newest first, with
 * names, period and status, including cancelled and declined ones so nothing disappears (payments
 * waiting for the reader to confirm are picked out on the screen), and confirmed totals per pair
 * for the current year.
 */
export async function listPayments(userId: string, groupId: string) {
  const { group, members } = await getGroupForMember(userId, groupId);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const groupLedgers = await db.select().from(ledgers).where(eq(ledgers.groupId, groupId));
  const ledgerIds = groupLedgers.map((l) => l.id);
  const all = ledgerIds.length
    ? await db.select().from(payments).where(inArray(payments.ledgerId, ledgerIds)).orderBy(desc(payments.paidOn), desc(payments.createdAt))
    : [];
  const endsOn = (id: string) => groupLedgers.find((l) => l.id === id)?.endsOn ?? "";
  const startsOn = (id: string) => groupLedgers.find((l) => l.id === id)?.startsOn ?? "";

  const year = Number((await requestToday()).slice(0, 4));
  return {
    currency: group.currency,
    year,
    payments: all.map((p) => ({
      id: p.id,
      ledgerId: p.ledgerId,
      startsOn: startsOn(p.ledgerId),
      endsOn: endsOn(p.ledgerId),
      from: p.fromUser,
      to: p.toUser,
      fromName: nameOf(p.fromUser),
      toName: nameOf(p.toUser),
      amountCents: p.amountCents,
      paidOn: p.paidOn,
      recordedBy: p.recordedBy,
      confirmed: p.confirmedAt !== null,
      status: statusOf(p),
    })),
    totals: yearTotals(all.map((p) => ({ ...fact(p), paidOn: p.paidOn })), year).map((t) => ({ ...t, fromName: nameOf(t.from), toName: nameOf(t.to) })),
  };
}

/** What the Record a payment form on the period screen sends. The payer is always the caller. */
export interface NewPayment {
  ledgerId: string;
  toUser: string;
  amountCents: number;
  paidOn: string;
}

/**
 * Records a payment the caller made (rule 24, decided 10 Nov 2026: only the payer records). The
 * period must be agreed and not settled; the caller must owe the receiver in it; the amount must
 * fit what is left after payments still waiting (part payments allowed); the date cannot be in
 * the future. It waits for the receiver to confirm (rule 25).
 */
export async function recordPayment(userId: string, input: NewPayment) {
  if (!UUID.test(input.ledgerId)) throw new ServiceError("not_found", "Period not found.");
  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.id, input.ledgerId));
  if (!ledger) throw new ServiceError("not_found", "Period not found.");
  await getGroupForMember(userId, ledger.groupId).catch(() => {
    throw new ServiceError("not_found", "Period not found.");
  });
  if (periodStage(ledger) !== "agreed") throw new ServiceError("invalid", "Payments can be recorded once everyone has agreed the period, and until it is settled.");
  const today = await requestToday();
  if (!isIsoDate(input.paidOn) || input.paidOn > today) throw new ServiceError("invalid", "Check the date.", { paidOn: "Choose a date that is not in the future." });
  const error = checkPayment({ from: userId, to: input.toUser, amountCents: input.amountCents }, await periodDebts(ledger));
  if (error) throw new ServiceError("invalid", error, { amount: error });
  const [created] = await db
    .insert(payments)
    .values({ ledgerId: ledger.id, fromUser: userId, toUser: input.toUser, amountCents: input.amountCents, paidOn: input.paidOn, recordedBy: userId })
    .returning({ id: payments.id });
  return { id: created.id };
}

/** Loads an unconfirmed payment the reader is part of, or stops with "not found". */
async function openPaymentFor(userId: string, paymentId: string) {
  if (!UUID.test(paymentId)) throw new ServiceError("not_found", "Payment not found.");
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || (p.fromUser !== userId && p.toUser !== userId)) throw new ServiceError("not_found", "Payment not found.");
  if (p.confirmedAt) throw new ServiceError("invalid", "This payment is already confirmed and cannot change.");
  if (p.removedAt) throw new ServiceError("invalid", "This payment was already cancelled or declined.");
  return p;
}

/**
 * The person paid confirms a payment (rule 25). Only the receiver can confirm. Then the period is
 * checked: if everything is paid, it is settled (rule 22a).
 */
export async function confirmPayment(userId: string, paymentId: string) {
  const p = await openPaymentFor(userId, paymentId);
  if (p.toUser !== userId || p.recordedBy === userId) throw new ServiceError("forbidden", "Only the person who was paid can confirm this payment.");
  await db.update(payments).set({ confirmedAt: new Date() }).where(and(eq(payments.id, paymentId), isNull(payments.confirmedAt), isNull(payments.removedAt)));
  await settleIfPaid(p.ledgerId);
  return { id: paymentId, confirmed: true };
}

/**
 * Takes back a payment that is still waiting: the payer who recorded it cancels it, or the person
 * paid declines it (for example the money never arrived). It stops counting but stays in the
 * history marked cancelled or declined, so the other person sees what happened (rule 25, decided
 * 10 Nov 2026). A confirmed payment cannot be removed.
 */
export async function removePayment(userId: string, paymentId: string) {
  await openPaymentFor(userId, paymentId);
  await db
    .update(payments)
    .set({ removedAt: new Date(), removedBy: userId })
    .where(and(eq(payments.id, paymentId), isNull(payments.confirmedAt), isNull(payments.removedAt)));
  return { id: paymentId, removed: true };
}

/** How many payments are waiting for the reader to confirm, for the Balance tab and Home. */
export async function countToConfirm(userId: string, groupId: string): Promise<number> {
  const groupLedgers = await db.select({ id: ledgers.id }).from(ledgers).where(eq(ledgers.groupId, groupId));
  if (groupLedgers.length === 0) return 0;
  const waiting = await db
    .select({ id: payments.id, recordedBy: payments.recordedBy, from: payments.fromUser, to: payments.toUser })
    .from(payments)
    .where(and(inArray(payments.ledgerId, groupLedgers.map((l) => l.id)), isNull(payments.confirmedAt), isNull(payments.removedAt)));
  return waiting.filter((w) => w.to === userId && w.recordedBy !== userId).length;
}

/**
 * Payments for one period, for the period screen (rules 24 to 26): per amount owed, what is
 * confirmed, waiting and left, and the waiting payments themselves so the payer can cancel and
 * the receiver can confirm or decline them there. Empty until the period is agreed. Members only.
 */
export async function periodPayments(userId: string, ledgerId: string) {
  if (!UUID.test(ledgerId)) throw new ServiceError("not_found", "Period not found.");
  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.id, ledgerId));
  if (!ledger) throw new ServiceError("not_found", "Period not found.");
  await getGroupForMember(userId, ledger.groupId);
  const stage = periodStage(ledger);
  if (stage !== "agreed" && stage !== "settled") return { debts: [], waiting: [], declined: [] };
  const list = await db.select().from(payments).where(eq(payments.ledgerId, ledgerId)).orderBy(payments.createdAt);
  const short = (p: typeof payments.$inferSelect) => ({ id: p.id, from: p.fromUser, to: p.toUser, amountCents: p.amountCents, paidOn: p.paidOn });
  return {
    debts: await periodDebts(ledger),
    waiting: list.filter((p) => statusOf(p) === "waiting").map(short),
    declined: latestDeclines(list).map(short),
  };
}

/**
 * Declined payments still worth showing: per pair in a period, the last decline, when nothing was
 * recorded after it. Once the payer records again, the old decline drops off the period screen
 * and Home (it stays in the Payments history).
 */
function latestDeclines(list: (typeof payments.$inferSelect)[]) {
  const shown: (typeof payments.$inferSelect)[] = [];
  const pairs = new Set(list.map((p) => `${p.ledgerId}|${p.fromUser}|${p.toUser}`));
  for (const pair of pairs) {
    const mine = list.filter((p) => `${p.ledgerId}|${p.fromUser}|${p.toUser}` === pair).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const last = mine[mine.length - 1];
    if (last && statusOf(last) === "declined") shown.push(last);
  }
  return shown;
}

/**
 * What is waiting for the reader in Balance, for the one line on Home (src/domain/home.ts):
 * payments to confirm (by who paid), their latest declined payment, a closed period they have not
 * agreed, a payment they still have to record, and the open period's close date by the device's
 * date (rule 2c). Members only.
 */
export async function balanceSituation(userId: string, groupId: string): Promise<BalanceSituation> {
  const { members, openLedger } = await getGroupForMember(userId, groupId);
  const first = (id: string) => (members.find((m) => m.id === id)?.name ?? "Someone").split(" ")[0];
  const groupLedgers = await db.select().from(ledgers).where(eq(ledgers.groupId, groupId));
  const all = groupLedgers.length
    ? await db.select().from(payments).where(inArray(payments.ledgerId, groupLedgers.map((l) => l.id)))
    : [];
  const confirmFrom = [...new Set(all.filter((p) => statusOf(p) === "waiting" && p.toUser === userId).map((p) => first(p.fromUser)))];

  const byOldest = [...groupLedgers].sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  const declinedRow = latestDeclines(all).filter((p) => p.fromUser === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const ledgerOf = (id: string) => groupLedgers.find((l) => l.id === id);

  const closed = await listClosedPeriods(userId, groupId);
  const notAgreed = closed.filter((c) => c.stage === "closed" && !c.iAgreed).sort((a, b) => a.endsOn.localeCompare(b.endsOn))[0];

  let toPay: { to: string; month: typeof groupLedgers[number] } | null = null;
  for (const l of byOldest.filter((x) => periodStage(x) === "agreed")) {
    const debts = debtStatus(l.frozenLines ?? [], all.filter((p) => p.ledgerId === l.id && !p.removedAt).map(fact));
    const mine = debts.find((d) => d.from === userId && d.capCents > 0);
    if (mine) {
      toPay = { to: first(mine.to), month: l };
      break;
    }
  }
  const today = await requestToday();
  // Periods are named from their dates ("October", "4–10 Nov"), decided 10 Nov 2026.
  const thisYear = Number(today.slice(0, 4));
  const nameOf = (l: { startsOn: string; endsOn: string } | undefined) => (l ? periodLabel(l.startsOn, l.endsOn, thisYear) : "a past period");
  return {
    confirmFrom,
    declined: declinedRow ? { by: first(declinedRow.toUser), month: nameOf(ledgerOf(declinedRow.ledgerId)) } : null,
    toAgree: notAgreed ? nameOf(notAgreed) : null,
    toPay: toPay ? { to: toPay.to, month: nameOf(toPay.month) } : null,
    closes: openLedger ? { month: nameOf(openLedger), daysLeft: daysUntil(today, openLedger.endsOn) } : null,
  };
}
