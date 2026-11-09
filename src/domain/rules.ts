/**
 * Sharing rules: who pays for the items in a category.
 *
 * What it holds: the four kinds of rule, the check on a rule before it is saved, turning typed
 * percentages into basis points, an even split, the sentence that describes a rule, and who carries
 * an item's cost under a rule.
 *
 * Why it matters: the rule sits on the category, not the item, so it is set once and every later
 * receipt follows it (SPEC.md rules 11 and 13). Four kinds, agreed with Maduabuchi on 9 Nov 2026:
 * - everyone: split equally between all current members;
 * - payer: "Whoever paid". The person who paid for the receipt carries it all, so the item moves
 *   no money (for example chocolate bars: each person pays for their own);
 * - shares: fixed people and percentages totalling 100%. "One person" is shares with 100% for one
 *   member; "Custom" is any other mix, for example 30/70.
 * A category with no rule (kind null) is not split; its items stay out of the balance (rule 12).
 * Percentages are stored as basis points: 10000 = 100%, 3333 = 33,33%.
 * Pure code. Tests: tests/unit/rules.test.ts
 */

import { FULL_SHARE_BP, splitCents } from "./money";

/** The kinds of sharing rule. */
export const RULE_KINDS = ["everyone", "payer", "shares"] as const;
export type RuleKind = (typeof RULE_KINDS)[number];

/** One person's share of a category, in basis points. Used only by the "shares" kind. */
export interface Share {
  userId: string;
  bp: number;
}

/** A category's rule. shares is empty unless kind is "shares". */
export interface Rule {
  kind: RuleKind;
  shares: Share[];
}

/**
 * A percentage typed by a person ("30", "33,33", "33.33") as basis points, or null if it is not a
 * percentage from 0 to 100 with at most two decimals. Worked on the text, not as a decimal number.
 */
export function percentToBp(text: string): number | null {
  const t = text.trim().replace(",", ".");
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return bp <= FULL_SHARE_BP ? bp : null;
}

/** Basis points as a percentage for display: 3000 -> "30", 3333 -> "33,33". */
export function bpToPercent(bp: number): string {
  const whole = Math.floor(bp / 100);
  const rest = bp % 100;
  return rest === 0 ? String(whole) : `${whole},${String(rest).padStart(2, "0")}`;
}

/**
 * Equal shares for the given people, totalling exactly 100%. Uses the same largest remainder
 * rounding as money (rule 15), so three people get 3334, 3333 and 3333.
 */
export function equalShares(userIds: readonly string[]): Share[] {
  const parts = splitCents(FULL_SHARE_BP, userIds.map(() => 1));
  return userIds.map((userId, i) => ({ userId, bp: parts[i] }));
}

/**
 * Checks a rule before it is saved (SPEC.md rule 11). Returns a message, or null when it is fine.
 * For "shares": at least one person, each a member, each between 0,01% and 100%, no one twice,
 * and together exactly 100%.
 */
export function validateRule(rule: Rule, memberIds: readonly string[]): string | null {
  if (!RULE_KINDS.includes(rule.kind)) return "Choose how this category is shared.";
  if (rule.kind !== "shares") return rule.shares.length === 0 ? null : "This rule takes no percentages.";
  if (rule.shares.length === 0) return "Choose at least one person.";
  const seen = new Set<string>();
  for (const s of rule.shares) {
    if (!memberIds.includes(s.userId)) return "Everyone sharing must be in the group.";
    if (seen.has(s.userId)) return "Each person can appear once.";
    seen.add(s.userId);
    if (!Number.isInteger(s.bp) || s.bp < 1 || s.bp > FULL_SHARE_BP) return "Each share must be more than 0% and at most 100%.";
  }
  const total = rule.shares.reduce((a, s) => a + s.bp, 0);
  if (total !== FULL_SHARE_BP) return `Shares add up to ${bpToPercent(total)}%. They must add up to 100%.`;
  return null;
}

/**
 * The short description shown next to a category, for example "Everyone equal", "Whoever paid",
 * "Butch 100%" or "Butch 30%, Izu 70%". "No rule yet" when there is none.
 */
export function describeRule(rule: Rule | null, nameOf: (userId: string) => string): string {
  if (!rule) return "No rule yet";
  if (rule.kind === "everyone") return "Everyone equal";
  if (rule.kind === "payer") return "Whoever paid";
  return [...rule.shares]
    .sort((a, b) => b.bp - a.bp || nameOf(a.userId).localeCompare(nameOf(b.userId)))
    .map((s) => `${nameOf(s.userId)} ${bpToPercent(s.bp)}%`)
    .join(", ");
}

/**
 * Who carries an item's cost under a rule, as weights per person, for splitCents.
 * everyone: every current member, equally; payer: only the payer; shares: the rule's shares.
 * Members are taken in the order given, so results are repeatable.
 */
export function weightsFor(rule: Rule, payerId: string, memberIds: readonly string[]): Share[] {
  if (rule.kind === "everyone") return memberIds.map((userId) => ({ userId, bp: 1 }));
  if (rule.kind === "payer") return [{ userId: payerId, bp: 1 }];
  return rule.shares;
}
