/**
 * The period breakdown: one person's month, category by category.
 *
 * What it holds: the calculation behind the breakdown on the period screen, and the sentence that
 * says how a category was split.
 *
 * Why it matters: a member is asked to agree to an amount (SPEC.md rule 22). The breakdown shows
 * where it comes from, in the form approved by Maduabuchi on 10 Nov 2026: for each category, the
 * person's share of it (what it cost them), how many times it was bought and the total, and how it
 * was split in words. The totals at the bottom (paid, share, owed) reconcile with the amount at the
 * top. Shares are worked out exactly as the balance does (src/domain/balance.ts, rules 15 and 16),
 * so the two always agree. Items left out of the balance (unsorted, no rule) are left out here too.
 * Pure code. Tests: tests/unit/breakdown.test.ts
 */

import { splitCents } from "./money";
import { bpToPercent, type Rule, weightsFor } from "./rules";

/** One saved item as the breakdown needs it. */
export interface BreakdownItem {
  categoryId: string | null;
  categoryName: string | null;
  priceCents: number;
  payerId: string;
  date: string;
  storeName: string | null;
  rule: Rule | null;
  /** Who was in the group on the day it was bought (rule 2d); "Split equally" is between them. */
  sharers?: readonly string[];
}

/** One purchase inside a category card. */
export interface Purchase {
  date: string;
  storeName: string | null;
  payerId: string;
  priceCents: number;
}

/** One category card. */
export interface CategoryLine {
  categoryId: string;
  name: string;
  shareCents: number;
  totalCents: number;
  timesBought: number;
  splitText: string;
  purchases: Purchase[];
}

/** What a member's share of one item is, in cents, under the item's rule. Same arithmetic as the balance. */
function shareOf(item: BreakdownItem & { rule: Rule }, personId: string, memberIds: readonly string[]): number {
  const weights = weightsFor(item.rule, item.payerId, item.sharers ?? memberIds);
  const parts = splitCents(item.priceCents, weights.map((w) => w.bp));
  const i = weights.findIndex((w) => w.userId === personId);
  return i === -1 ? 0 : parts[i];
}

/**
 * The split in words, from the reader's side ("You" is the reader):
 * "Split 50/50 with Izu", "Split equally between 3", "You pay 100%", "Izu pays 100%",
 * "You 20% · Izu 80%", or for Whoever paid "Each pays for their own · you bought 1 of 3".
 */
export function splitText(
  rule: Rule,
  payers: readonly string[],
  personId: string,
  viewerId: string,
  memberIds: readonly string[],
  nameOf: (id: string) => string,
): string {
  const who = (id: string) => (id === viewerId ? "You" : nameOf(id));
  const pays = (id: string) => `${who(id)} ${id === viewerId ? "pay" : "pays"} 100%`;
  if (rule.kind === "everyone") {
    if (memberIds.length === 2) {
      const other = memberIds.find((id) => id !== personId) ?? memberIds[0];
      return `Split 50/50 with ${other === viewerId ? "you" : nameOf(other)}`;
    }
    return `Split equally between ${memberIds.length}`;
  }
  if (rule.kind === "payer") {
    const distinct = [...new Set(payers)];
    if (distinct.length === 1) return pays(distinct[0]);
    const mine = payers.filter((p) => p === personId).length;
    const subject = personId === viewerId ? "you" : nameOf(personId);
    return `Each pays for their own · ${subject} bought ${mine} of ${payers.length}`;
  }
  if (rule.shares.length === 1) return pays(rule.shares[0].userId);
  return [...rule.shares]
    .sort((a, b) => (a.userId === personId ? -1 : b.userId === personId ? 1 : b.bp - a.bp))
    .map((s) => `${who(s.userId)} ${bpToPercent(s.bp)}%`)
    .join(" · ");
}

/**
 * The breakdown for one person (personId) as read by the viewer (viewerId).
 * Cards are ordered by the person's share, largest first, then by total. Totals: what the person
 * paid for counted items, their share, and the difference (positive: they are owed).
 */
export function computeBreakdown(
  items: readonly BreakdownItem[],
  personId: string,
  viewerId: string,
  memberIds: readonly string[],
  nameOf: (id: string) => string,
) {
  const byCategory = new Map<string, (BreakdownItem & { rule: Rule })[]>();
  for (const item of items) {
    if (!item.categoryId || !item.rule) continue;
    const list = byCategory.get(item.categoryId) ?? [];
    list.push(item as BreakdownItem & { rule: Rule });
    byCategory.set(item.categoryId, list);
  }
  let paidCents = 0;
  let shareTotal = 0;
  const lines: CategoryLine[] = [];
  for (const [categoryId, list] of byCategory) {
    const shareCents = list.reduce((n, i) => n + shareOf(i, personId, memberIds), 0);
    paidCents += list.filter((i) => i.payerId === personId).reduce((n, i) => n + i.priceCents, 0);
    shareTotal += shareCents;
    lines.push({
      categoryId,
      name: list[0].categoryName ?? "Category",
      shareCents,
      totalCents: list.reduce((n, i) => n + i.priceCents, 0),
      timesBought: list.length,
      // A rule is the same for every item of a category, so the first item's rule describes them all.
      splitText: splitText(list[0].rule, list.map((i) => i.payerId), personId, viewerId, list[0].sharers ?? memberIds, nameOf),
      purchases: list
        .map((i) => ({ date: i.date, storeName: i.storeName, payerId: i.payerId, priceCents: i.priceCents }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  }
  lines.sort((a, b) => b.shareCents - a.shareCents || b.totalCents - a.totalCents || a.name.localeCompare(b.name));
  return { lines, paidCents, shareCents: shareTotal, balanceCents: paidCents - shareTotal };
}
