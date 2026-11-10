/**
 * Membership over time: who was in a group on a given day, and what that means for splits.
 *
 * Why it matters (SPEC.md rules 2d and 2e, decided 10 Nov 2026): people join and leave groups.
 * "Split equally" means everyone who was a member on the day the item was bought, not whoever is
 * in the group now. Before this, someone joining mid-period was charged for receipts from before
 * they joined, and a leaver's share would have moved onto the others. A leaver still owes, and is
 * owed, their share of everything bought before they left, and still agrees their periods.
 * Pure functions, no database.
 */

import type { Rule } from "./rules";

/** One person's membership of a group. Dates are YYYY-MM-DD, by the device's date (rule 2c). */
export interface Membership {
  userId: string;
  /** The day they joined; they share items bought from this day on. */
  joinedOn: string;
  /** The day they left or were removed, or null. Items bought on or after this day are not theirs. */
  leftOn: string | null;
}

/** True while the person is still in the group (has not left or been removed). */
export function isCurrent(m: Membership): boolean {
  return m.leftOn === null;
}

/** Who was in the group on a day: joined on or before it, and not yet left. */
export function membersOn(memberships: readonly Membership[], day: string): string[] {
  return memberships.filter((m) => m.joinedOn <= day && (m.leftOn === null || day < m.leftOn)).map((m) => m.userId);
}

/**
 * Who belongs to a period (start and end included): everyone who was a member on at least one
 * of its days. They are the ones who agree it (rule 21) and whose amounts it holds; a leaver
 * stays in the periods they were part of (rule 2e).
 */
export function periodMembers(memberships: readonly Membership[], startsOn: string, endsOn: string): string[] {
  return memberships.filter((m) => m.joinedOn <= endsOn && (m.leftOn === null || m.leftOn > startsOn)).map((m) => m.userId);
}

/**
 * The day an item counts as bought, for deciding who shares it: the printed date, or the day it
 * was saved when no date was read. Never before the period started, so an old receipt scanned into
 * a period is shared by the period's members on its first day.
 */
export function itemDay(purchaseDate: string | null, savedOn: string | null, periodStartsOn: string): string {
  const day = purchaseDate ?? savedOn ?? periodStartsOn;
  return day < periodStartsOn ? periodStartsOn : day;
}

/**
 * The rule that applies to an item given who was in the group that day. "Split equally" and
 * "Whoever paid" always work. A rule that names someone who was not a member that day (One person,
 * or Custom with a share for them) cannot be applied, so the item needs a new rule, like an item
 * whose category has none (rules 12 and 2e).
 */
export function ruleForDay(rule: Rule | null, sharers: readonly string[]): Rule | null {
  if (rule === null || rule.kind !== "shares") return rule;
  return rule.shares.every((s) => s.bp === 0 || sharers.includes(s.userId)) ? rule : null;
}

/**
 * Adds to each item who shares it and the rule that applies on its day (rules 2d and 2e): the
 * members on the day it was bought, and its category's rule, or null when there is no rule or the
 * rule names someone who was not a member that day. Used for every balance, breakdown and
 * "needs a rule" count, so they always agree.
 */
export function withMembership<T extends { categoryId: string | null; purchaseDate: string | null; savedAt: Date | null }>(
  items: readonly T[],
  memberships: readonly Membership[],
  periodStartsOn: string,
  ruleOf: (categoryId: string | null) => Rule | null,
): (T & { sharers: string[]; rule: Rule | null })[] {
  return items.map((item) => {
    const sharers = membersOn(memberships, itemDay(item.purchaseDate, item.savedAt?.toISOString().slice(0, 10) ?? null, periodStartsOn));
    return { ...item, sharers, rule: ruleForDay(ruleOf(item.categoryId), sharers) };
  });
}

/**
 * Who a period belongs to, for agreeing it and for its breakdown (rules 21, 2d, 2e). Current
 * members of the period always count. Someone who has left counts only if the period involves
 * them: they paid for an item in it or share one. A person removed with nothing in the period
 * (for example a wrong account that joined and was removed the same day) does not appear and does
 * not have to agree (found by Maduabuchi, 10 Nov 2026).
 */
export function periodPeople(
  memberships: readonly Membership[],
  startsOn: string,
  endsOn: string,
  items: readonly { payerId: string; sharers?: readonly string[] }[],
): string[] {
  const involved = new Set(items.flatMap((i) => [i.payerId, ...(i.sharers ?? [])]));
  const current = new Set(memberships.filter(isCurrent).map((m) => m.userId));
  return periodMembers(memberships, startsOn, endsOn).filter((id) => current.has(id) || involved.has(id));
}
