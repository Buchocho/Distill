/**
 * The balance of a period: who owes whom.
 *
 * What it holds: one function that turns a period's saved items into debts between members,
 * netted to at most one line per pair, plus the count of items left out.
 *
 * Why it matters: this is the answer Distill exists to give (SPEC.md rules 15 to 17).
 * For each item with a category and a rule, the price is split by the rule in whole cents using
 * the largest remainder method (rule 15); every sharer other than the payer owes the payer their
 * part (rule 16). Debts in both directions between two people are netted ("Izu owes Butch 18,40").
 * Items with no category, or in a category with no rule, are left out and counted (rule 17).
 * A negative item (a voucher) reduces what sharers owe, in the same way.
 * Pure code. Tests: tests/unit/balance.test.ts
 */

import { splitCents } from "./money";
import { type Rule, weightsFor } from "./rules";

/** One saved item as the balance needs it. rule is null when its category has no rule; categoryId null means unsorted. */
export interface BalanceItem {
  priceCents: number;
  payerId: string;
  categoryId: string | null;
  rule: Rule | null;
  /** Who was in the group on the day the item was bought (rule 2d). "Split equally" splits between them; without it, between memberIds. */
  sharers?: readonly string[];
}

/** One line of the balance: from owes to this many cents (always more than zero). */
export interface BalanceLine {
  from: string;
  to: string;
  cents: number;
}

/**
 * Works out the balance (SPEC.md rules 15 to 17).
 * memberIds are the group's current members, in a fixed order; "Everyone equal" uses them all.
 * Returns the netted lines (largest first), and how many items were left out because they are
 * unsorted or their category has no rule yet.
 */
export function computeBalance(items: readonly BalanceItem[], memberIds: readonly string[]) {
  // owed[a][b] = what a owes b, before netting.
  const owed = new Map<string, Map<string, number>>();
  const add = (from: string, to: string, cents: number) => {
    const row = owed.get(from) ?? new Map<string, number>();
    row.set(to, (row.get(to) ?? 0) + cents);
    owed.set(from, row);
  };
  let unsortedCount = 0;
  let noRuleCount = 0;
  let countedCount = 0;

  for (const item of items) {
    if (item.categoryId === null) {
      unsortedCount += 1;
      continue;
    }
    if (item.rule === null) {
      noRuleCount += 1;
      continue;
    }
    countedCount += 1;
    const weights = weightsFor(item.rule, item.payerId, item.sharers ?? memberIds);
    const parts = splitCents(item.priceCents, weights.map((w) => w.bp));
    weights.forEach((w, i) => {
      if (w.userId !== item.payerId && parts[i] !== 0) add(w.userId, item.payerId, parts[i]);
    });
  }

  // Net each pair once: if a owes b 5,00 and b owes a 2,00, the line is a owes b 3,00.
  const lines: BalanceLine[] = [];
  const people = [...new Set([...owed.keys(), ...[...owed.values()].flatMap((r) => [...r.keys()])])].sort();
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      const net = (owed.get(a)?.get(b) ?? 0) - (owed.get(b)?.get(a) ?? 0);
      if (net > 0) lines.push({ from: a, to: b, cents: net });
      if (net < 0) lines.push({ from: b, to: a, cents: -net });
    }
  }
  lines.sort((x, y) => y.cents - x.cents);
  return { lines, unsortedCount, noRuleCount, countedCount };
}

/**
 * One person's position from the lines: positive when they are owed overall, negative when they owe.
 * Used for the big number on the Balance screen ("You are owed 10,10 €").
 */
export function netFor(userId: string, lines: readonly BalanceLine[]): number {
  return lines.reduce((n, l) => n + (l.to === userId ? l.cents : 0) - (l.from === userId ? l.cents : 0), 0);
}
