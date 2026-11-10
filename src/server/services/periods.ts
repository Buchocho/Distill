/**
 * Periods service: closed periods, agreeing, and the group's close date.
 *
 * What it holds: the closed periods still to settle, everything the Close the period screen needs,
 * Agree, and changing when accounts close.
 *
 * Why it matters: this is how a group settles a month (stories US6, US7, US8), in two stages agreed
 * with Maduabuchi on 10 Nov 2026 (src/domain/periods.ts). While a closed period is not yet agreed
 * by all, its amounts follow the current rules and any change clears the agreements (rule 22).
 * When the last member agrees, the amounts are frozen in the period (rule 22a). The next period
 * opens on time whether or not anyone agreed (rule 23). Members only (architecture rule 4).
 */

import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { agreements, categories, groups, ledgers } from "@/server/db/schema";
import { computeBalance, netFor, type BalanceLine } from "@/domain/balance";
import { agreeBlockedBy, periodStage } from "@/domain/periods";
import type { Rule } from "@/domain/rules";
import { type CloseSetting, validateCloseSetting } from "@/domain/ledgers";
import { assertMember, getGroupForMember, UUID } from "./groups";
import { ledgerItems, rulesForGroup } from "./categories";
import { ServiceError } from "./errors";

/** Loads a period for a member of its group, or stops with "not found" (architecture rule 4). */
async function ledgerForMember(userId: string, ledgerId: string) {
  if (!UUID.test(ledgerId)) throw new ServiceError("not_found", "Period not found.");
  const [ledger] = await db.select().from(ledgers).where(eq(ledgers.id, ledgerId));
  if (!ledger) throw new ServiceError("not_found", "Period not found.");
  await assertMember(userId, ledger.groupId).catch(() => {
    throw new ServiceError("not_found", "Period not found.");
  });
  return ledger;
}

/**
 * A period's items and rules, and its balance. Once everyone agreed, the frozen lines and frozen
 * rules are used, so later rule changes do not touch it (SPEC.md rule 22a); before that, the current
 * rules. Items left out of the balance (unsorted, no rule) are returned for sorting (rules 17, 20).
 */
async function periodBalance(ledger: typeof ledgers.$inferSelect, memberIds: string[]) {
  const periodItems = await ledgerItems(ledger.id);
  const current = await rulesForGroup(ledger.groupId);
  const ruleOf = (categoryId: string | null): Rule | null => {
    if (!categoryId) return null;
    if (ledger.frozenRules) return (ledger.frozenRules[categoryId] as Rule | null | undefined) ?? null;
    return current.get(categoryId) ?? null;
  };
  const live = computeBalance(
    periodItems.map((i) => ({ priceCents: i.priceCents, payerId: i.payerId, categoryId: i.categoryId, rule: ruleOf(i.categoryId) })),
    memberIds,
  );
  const lines: BalanceLine[] = ledger.frozenLines ?? live.lines;
  const noRuleCategories = [...new Set(periodItems.filter((i) => i.categoryId && ruleOf(i.categoryId) === null).map((i) => i.categoryId as string))];
  return {
    lines,
    items: periodItems.map((i) => ({ ...i, rule: ruleOf(i.categoryId) })),
    unsorted: periodItems.filter((i) => i.categoryId === null),
    noRuleCount: live.noRuleCount,
    noRuleCategories,
    // The rules in force for this period's categories, to freeze when everyone agrees.
    rulesUsed: Object.fromEntries([...new Set(periodItems.map((i) => i.categoryId).filter((c): c is string => c !== null))].map((c) => [c, ruleOf(c)])),
  };
}

/**
 * The group's past periods, newest first, for the Past periods list on the Balance tab (approved
 * 10 Nov 2026): each with its stage, the user's own amount, whether the user has agreed, and how
 * many members have (stories US7, US8). Goes back two years.
 */
export async function listClosedPeriods(userId: string, groupId: string) {
  const { members } = await getGroupForMember(userId, groupId);
  const memberIds = members.map((m) => m.id);
  const closed = await db
    .select()
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "closed")))
    .orderBy(desc(ledgers.endsOn))
    .limit(24);
  const result = [];
  for (const l of closed) {
    const agreed = await db.select({ userId: agreements.userId }).from(agreements).where(eq(agreements.ledgerId, l.id));
    result.push({
      id: l.id,
      startsOn: l.startsOn,
      endsOn: l.endsOn,
      stage: periodStage(l),
      myNet: netFor(userId, (await periodBalance(l, memberIds)).lines),
      iAgreed: agreed.some((a) => a.userId === userId),
      agreedCount: agreed.length,
      memberCount: members.length,
    });
  }
  return result;
}

/**
 * Everything the period screen (screen 5) needs, for the open period or a closed one: the period
 * and its stage, the balance lines with names, the user's own amount, the items with their rules
 * for the breakdown, leftover items to sort or remove, categories without a rule, who has agreed,
 * and whether Agree is open (SPEC.md rules 20 to 22).
 */
export async function getPeriod(userId: string, ledgerId: string) {
  const ledger = await ledgerForMember(userId, ledgerId);
  const { group, members } = await getGroupForMember(userId, ledger.groupId);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const stage = periodStage(ledger);
  const balance = await periodBalance(ledger, members.map((m) => m.id));
  const agreed = await db.select({ userId: agreements.userId }).from(agreements).where(eq(agreements.ledgerId, ledger.id));
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.groupId, ledger.groupId)).orderBy(asc(categories.name));
  return {
    ledger: { id: ledger.id, groupId: ledger.groupId, startsOn: ledger.startsOn, endsOn: ledger.endsOn },
    stage,
    currency: group.currency,
    lines: balance.lines.map((l) => ({ ...l, fromName: nameOf(l.from), toName: nameOf(l.to) })),
    myNet: netFor(userId, balance.lines),
    items: balance.items.map((i) => ({
      categoryId: i.categoryId,
      categoryName: cats.find((c) => c.id === i.categoryId)?.name ?? null,
      priceCents: i.priceCents,
      payerId: i.payerId,
      // The printed date, or the day it was saved when no date was read.
      date: i.purchaseDate ?? i.savedAt?.toISOString().slice(0, 10) ?? ledger.endsOn,
      storeName: i.storeName,
      rule: i.rule,
    })),
    unsorted: stage === "closed" ? balance.unsorted : [],
    noRule: stage === "closed" ? cats.filter((c) => balance.noRuleCategories.includes(c.id)) : [],
    categories: cats,
    agreeBlockedBy: stage === "closed" ? agreeBlockedBy(balance.unsorted.length, balance.noRuleCount) : null,
    members: members.map((m) => ({ id: m.id, name: m.name, agreed: agreed.some((a) => a.userId === m.id) })),
  };
}

/**
 * The user agrees to their amount for a closed period (SPEC.md rules 21 and 22, story US8).
 * Only when nothing is left to sort. When this makes every member agreed, the period's amounts are
 * frozen (stage 1, rule 22a): later rule changes no longer touch it.
 */
export async function agree(userId: string, ledgerId: string) {
  const ledger = await ledgerForMember(userId, ledgerId);
  const stage = periodStage(ledger);
  if (stage === "open") throw new ServiceError("invalid", "This period is still open.");
  if (stage !== "closed") return { stage };
  const { members } = await getGroupForMember(userId, ledger.groupId);
  const memberIds = members.map((m) => m.id);
  const balance = await periodBalance(ledger, memberIds);
  const blocked = agreeBlockedBy(balance.unsorted.length, balance.noRuleCount);
  if (blocked) throw new ServiceError("invalid", blocked);
  await db.insert(agreements).values({ ledgerId, userId }).onConflictDoNothing();
  const agreed = await db.select({ userId: agreements.userId }).from(agreements).where(eq(agreements.ledgerId, ledgerId));
  if (memberIds.every((id) => agreed.some((a) => a.userId === id))) {
    // Everyone agreed: freeze the amounts and the rules behind them, so the breakdown keeps matching.
    // Only if not frozen already by another request.
    await db
      .update(ledgers)
      // Nothing owed at all: there is nothing to pay, so the period is settled at once (stage 2).
      .set({ agreedAt: new Date(), frozenLines: balance.lines, frozenRules: balance.rulesUsed, settledAt: balance.lines.length === 0 ? new Date() : null })
      .where(and(eq(ledgers.id, ledgerId), isNull(ledgers.agreedAt)));
    return { stage: "agreed" as const };
  }
  return { stage: "closed" as const };
}

/**
 * Changes when the group's accounts close (SPEC.md rule 18). Any member can do it. The open period
 * keeps its end date; the new rule applies from the next period, because the next period is made
 * from the rule at that moment (src/domain/periods.ts).
 */
export async function setCloseRule(userId: string, groupId: string, setting: CloseSetting) {
  await assertMember(userId, groupId);
  const error = validateCloseSetting(setting);
  if (error) throw new ServiceError("invalid", "Check the close date.", { close: error });
  await db.update(groups).set({ closeRule: setting.rule, closeDay: setting.day }).where(eq(groups.id, groupId));
  return { closeRule: setting.rule, closeDay: setting.day };
}
