/**
 * Categories service: categories, their sharing rules, their history, and moving an item to
 * another category.
 *
 * What it holds: list a group's categories with their rules and what needs sorting, load one
 * category for the rule screen, set a rule, add a category, the group's category history, the
 * list of items to sort, and changing a saved item's category.
 *
 * Why it matters: rules decide who pays for what (stories US3 and US4). A rule sits on the
 * category, so it is set once and applies to every item in it, including items already added in
 * the open period (SPEC.md rules 11, 13 and 13a). Every rule change and category creation is logged
 * and visible to all members (rule 14a); every change to an item's category is logged and shown on
 * the item (rule 14). After saving, only an item's category can change, never its name or price
 * (decided with Maduabuchi on 9 Nov 2026), and only while its period is open.
 * Every function checks group membership first (architecture rule 4).
 */

import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { agreements, categories, categoryChanges, categoryShares, itemChanges, items, ledgers, receipts, users } from "@/server/db/schema";
import { periodStage } from "@/domain/periods";
import { describeRule, type Rule, type RuleKind, validateRule } from "@/domain/rules";
import { CATEGORY_NAME_MAX, categoryKey } from "@/domain/receipts";
import { assertMember, getGroupForMember, UUID } from "./groups";
import { ServiceError } from "./errors";

/**
 * The rule of every category in a group, by category id: null when it has no rule yet.
 * Shared by the categories screens and the balance.
 */
export async function rulesForGroup(groupId: string): Promise<Map<string, Rule | null>> {
  const cats = await db.select({ id: categories.id, kind: categories.ruleKind }).from(categories).where(eq(categories.groupId, groupId));
  const shares = cats.length
    ? await db.select().from(categoryShares).where(inArray(categoryShares.categoryId, cats.map((c) => c.id)))
    : [];
  const rules = new Map<string, Rule | null>();
  for (const c of cats) {
    rules.set(
      c.id,
      c.kind
        ? { kind: c.kind as RuleKind, shares: shares.filter((s) => s.categoryId === c.id).map((s) => ({ userId: s.userId, bp: s.shareBp })) }
        : null,
    );
  }
  return rules;
}

/**
 * Clears every agreement given for the group's closed periods that are not yet agreed by all
 * (SPEC.md rule 22): a change that can move their amounts means everyone checks again.
 * Periods everyone agreed are frozen and keep their agreements (rule 22a). Pass a ledger id to
 * clear only that period.
 */
export async function clearOpenAgreements(groupId: string, ledgerId?: string) {
  const unagreed = await db
    .select({ id: ledgers.id })
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "closed"), isNull(ledgers.agreedAt), ledgerId ? eq(ledgers.id, ledgerId) : undefined));
  if (unagreed.length > 0) await db.delete(agreements).where(inArray(agreements.ledgerId, unagreed.map((l) => l.id)));
}

/** Saved items of one period with their receipt's payer, leaving out deleted ones. The balance and the sort lists use these. */
export async function ledgerItems(ledgerId: string) {
  return db
    .select({
      id: items.id,
      name: items.name,
      priceCents: items.priceCents,
      categoryId: items.categoryId,
      receiptId: receipts.id,
      storeName: receipts.storeName,
      payerId: receipts.paidBy,
    })
    .from(items)
    .innerJoin(receipts, eq(receipts.id, items.receiptId))
    .where(and(eq(receipts.ledgerId, ledgerId), eq(receipts.status, "saved"), isNull(items.deletedAt)))
    .orderBy(asc(receipts.savedAt), asc(items.position));
}

/** Saved items in the group's open period, with their receipt's payer. The balance and the sort list use these. */
export async function openPeriodItems(groupId: string) {
  return db
    .select({
      id: items.id,
      name: items.name,
      priceCents: items.priceCents,
      categoryId: items.categoryId,
      receiptId: receipts.id,
      storeName: receipts.storeName,
      payerId: receipts.paidBy,
    })
    .from(items)
    .innerJoin(receipts, eq(receipts.id, items.receiptId))
    .innerJoin(ledgers, eq(ledgers.id, receipts.ledgerId))
    .where(and(eq(receipts.groupId, groupId), eq(receipts.status, "saved"), eq(ledgers.status, "open"), isNull(items.deletedAt)))
    .orderBy(asc(receipts.savedAt), asc(items.position));
}

/**
 * The Categories screen (screen 4): every category with the sentence for its rule and how many
 * items it has in the open period, plus what needs sorting: items with no category, and items in
 * categories with no rule (SPEC.md rules 12 and 17). Categories with no rule come first.
 */
export async function listCategories(userId: string, groupId: string) {
  const { members } = await getGroupForMember(userId, groupId);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
  const rules = await rulesForGroup(groupId);
  const cats = await db.select().from(categories).where(eq(categories.groupId, groupId)).orderBy(asc(categories.name));
  const open = await openPeriodItems(groupId);
  const list = cats.map((c) => {
    const rule = rules.get(c.id) ?? null;
    return { id: c.id, name: c.name, hasRule: rule !== null, ruleText: describeRule(rule, nameOf), itemCount: open.filter((i) => i.categoryId === c.id).length };
  });
  list.sort((a, b) => Number(a.hasRule) - Number(b.hasRule));
  const unsortedItems = open.filter((i) => i.categoryId === null).length;
  const noRuleItems = open.filter((i) => i.categoryId !== null && rules.get(i.categoryId) === null).length;
  return { categories: list, needsSorting: unsortedItems + noRuleItems, unsortedItems, noRuleItems };
}

/** Loads a category for a member of its group, or stops with "not found" (architecture rule 4). */
async function categoryForMember(userId: string, categoryId: string) {
  if (!UUID.test(categoryId)) throw new ServiceError("not_found", "Category not found.");
  const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
  if (!category) throw new ServiceError("not_found", "Category not found.");
  await assertMember(userId, category.groupId).catch(() => {
    throw new ServiceError("not_found", "Category not found.");
  });
  return category;
}

/**
 * Everything the sharing rule screen (screen 4b) needs: the category, its rule, the group's
 * members, and the latest change, shown as "Last changed by Izu, today".
 */
export async function getCategory(userId: string, categoryId: string) {
  const category = await categoryForMember(userId, categoryId);
  const { members } = await getGroupForMember(userId, category.groupId);
  const rule = (await rulesForGroup(category.groupId)).get(category.id) ?? null;
  const [last] = await db
    .select({ summary: categoryChanges.summary, changedAt: categoryChanges.changedAt, by: users.displayName })
    .from(categoryChanges)
    .innerJoin(users, eq(users.id, categoryChanges.changedBy))
    .where(eq(categoryChanges.categoryId, category.id))
    .orderBy(desc(categoryChanges.changedAt))
    .limit(1);
  return { category: { id: category.id, name: category.name, groupId: category.groupId }, rule, members, lastChange: last ?? null };
}

/**
 * Sets a category's sharing rule (SPEC.md rules 11 and 13a, story US3). Any member can do it.
 * The rule applies at once to every item in the category in the open period, because the balance
 * is always worked out from the current rules. Closed periods keep their own record (step 5).
 * The change is logged with who made it (rule 14a).
 */
export async function setRule(userId: string, categoryId: string, rule: Rule) {
  const category = await categoryForMember(userId, categoryId);
  const { members } = await getGroupForMember(userId, category.groupId);
  const error = validateRule(rule, members.map((m) => m.id));
  if (error) throw new ServiceError("invalid", error, { rule: error });
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "Someone";
  await db.transaction(async (tx) => {
    await tx.delete(categoryShares).where(eq(categoryShares.categoryId, categoryId));
    if (rule.kind === "shares") {
      await tx.insert(categoryShares).values(rule.shares.map((s) => ({ categoryId, userId: s.userId, shareBp: s.bp })));
    }
    await tx.update(categories).set({ ruleKind: rule.kind }).where(eq(categories.id, categoryId));
    await tx.insert(categoryChanges).values({ categoryId, changedBy: userId, summary: `Rule set to ${describeRule(rule, nameOf)}` });
  });
  // The closed periods not yet agreed by all follow the current rules, so their amounts may move.
  await clearOpenAgreements(category.groupId);
  return { categoryId, ruleText: describeRule(rule, nameOf) };
}

/**
 * Adds a category by hand, from "Add category" on screen 4 (SPEC.md rule 14a). It starts with no
 * rule. A name already used in the group, ignoring capitals, is refused.
 */
export async function createCategory(userId: string, groupId: string, rawName: string) {
  await assertMember(userId, groupId);
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > CATEGORY_NAME_MAX) {
    throw new ServiceError("invalid", "Check the name.", { name: `Category names are 1 to ${CATEGORY_NAME_MAX} characters.` });
  }
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.groupId, groupId), sql`lower(${categories.name}) = ${categoryKey(name)}`));
  if (existing) throw new ServiceError("invalid", "Check the name.", { name: "This category already exists." });
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(categories).values({ groupId, name, createdBy: userId }).returning({ id: categories.id });
    await tx.insert(categoryChanges).values({ categoryId: created.id, changedBy: userId, summary: "Created" });
    return { id: created.id, name };
  });
}

/** The group's category history, newest first (screen 4c, SPEC.md rule 14a): what changed, who did it, when. */
export async function categoryHistory(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  return db
    .select({ id: categoryChanges.id, category: categories.name, summary: categoryChanges.summary, by: users.displayName, at: categoryChanges.changedAt })
    .from(categoryChanges)
    .innerJoin(categories, eq(categories.id, categoryChanges.categoryId))
    .innerJoin(users, eq(users.id, categoryChanges.changedBy))
    .where(eq(categories.groupId, groupId))
    .orderBy(desc(categoryChanges.changedAt))
    .limit(200);
}

/**
 * What needs sorting in the open period (SPEC.md rules 12 and 17): saved items with no category,
 * and the categories that have items but no rule yet, with their item counts.
 */
export async function listToSort(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  const rules = await rulesForGroup(groupId);
  const open = await openPeriodItems(groupId);
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.groupId, groupId)).orderBy(asc(categories.name));
  return {
    unsorted: open.filter((i) => i.categoryId === null),
    noRule: cats
      .filter((c) => rules.get(c.id) === null)
      .map((c) => ({ ...c, itemCount: open.filter((i) => i.categoryId === c.id).length }))
      .filter((c) => c.itemCount > 0),
    categories: cats,
  };
}

/**
 * Moves a saved item to another category, or back to unsorted (SPEC.md rules 13 and 14, story US4).
 * Any member can do it while the item's period is open. In a closed period not yet agreed by all,
 * only a leftover item with no category can be given one (rule 20), and that clears the agreements
 * given so far (rule 22). Only the category can change after saving, never the name or price.
 * The change is logged with who made it and shown on the item.
 */
export async function changeItemCategory(userId: string, itemId: string, categoryId: string | null) {
  if (!UUID.test(itemId)) throw new ServiceError("not_found", "Item not found.");
  const [row] = await db
    .select({ item: items, receipt: receipts, ledger: ledgers })
    .from(items)
    .innerJoin(receipts, eq(receipts.id, items.receiptId))
    .innerJoin(ledgers, eq(ledgers.id, receipts.ledgerId))
    .where(eq(items.id, itemId));
  if (!row) throw new ServiceError("not_found", "Item not found.");
  await assertMember(userId, row.receipt.groupId).catch(() => {
    throw new ServiceError("not_found", "Item not found.");
  });
  if (row.receipt.status !== "saved") throw new ServiceError("invalid", "Save the receipt first.");
  if (row.item.deletedAt) throw new ServiceError("invalid", "This item was removed.");
  const stage = periodStage(row.ledger);
  if (stage === "agreed" || stage === "settled") throw new ServiceError("invalid", "Everyone has agreed this period. Its items can no longer change.");
  if (stage === "closed" && row.item.categoryId !== null) {
    throw new ServiceError("invalid", "This period is closed. Only items without a category can still be sorted.");
  }
  if (categoryId !== null) {
    if (!UUID.test(categoryId)) throw new ServiceError("invalid", "Choose a category.");
    const [cat] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.groupId, row.receipt.groupId)));
    if (!cat) throw new ServiceError("invalid", "Choose a category.");
  }
  if (row.item.categoryId === categoryId) return { itemId, unchanged: true };
  const names = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.groupId, row.receipt.groupId));
  const label = (id: string | null) => (id ? names.find((n) => n.id === id)?.name ?? "a category" : "Unsorted");
  await db.transaction(async (tx) => {
    await tx.update(items).set({ categoryId, updatedBy: userId, updatedAt: new Date() }).where(eq(items.id, itemId));
    await tx.insert(itemChanges).values({ itemId, changedBy: userId, summary: `Category changed from ${label(row.item.categoryId)} to ${label(categoryId)}` });
  });
  if (stage === "closed") await clearOpenAgreements(row.receipt.groupId, row.ledger.id);
  return { itemId, unchanged: false };
}

/**
 * Removes a leftover item with no category from a closed period (SPEC.md rule 20). Only the person
 * who paid for its receipt can do it, so nobody removes someone else's purchase (decided 10 Nov
 * 2026). The item is marked removed, not erased, and the removal is logged. Clears the agreements
 * given so far for the period (rule 22).
 */
export async function deleteItem(userId: string, itemId: string) {
  if (!UUID.test(itemId)) throw new ServiceError("not_found", "Item not found.");
  const [row] = await db
    .select({ item: items, receipt: receipts, ledger: ledgers })
    .from(items)
    .innerJoin(receipts, eq(receipts.id, items.receiptId))
    .innerJoin(ledgers, eq(ledgers.id, receipts.ledgerId))
    .where(eq(items.id, itemId));
  if (!row) throw new ServiceError("not_found", "Item not found.");
  await assertMember(userId, row.receipt.groupId).catch(() => {
    throw new ServiceError("not_found", "Item not found.");
  });
  if (row.item.deletedAt) return { itemId };
  if (periodStage(row.ledger) !== "closed") throw new ServiceError("invalid", "Items can only be removed from a closed period before everyone agrees.");
  if (row.item.categoryId !== null) throw new ServiceError("invalid", "Only items without a category can be removed.");
  if (row.receipt.paidBy !== userId) throw new ServiceError("forbidden", "Only the person who paid for this receipt can remove its items.");
  await db.transaction(async (tx) => {
    await tx.update(items).set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() }).where(eq(items.id, itemId));
    await tx.insert(itemChanges).values({ itemId, changedBy: userId, summary: "Removed from the closed period" });
  });
  await clearOpenAgreements(row.receipt.groupId, row.ledger.id);
  return { itemId };
}

/** The change history of a receipt's items, newest first, for the saved receipt screen (SPEC.md rule 14). */
export async function itemHistory(receiptId: string) {
  return db
    .select({ itemId: itemChanges.itemId, summary: itemChanges.summary, by: users.displayName, at: itemChanges.changedAt })
    .from(itemChanges)
    .innerJoin(items, eq(items.id, itemChanges.itemId))
    .innerJoin(users, eq(users.id, itemChanges.changedBy))
    .where(eq(items.receiptId, receiptId))
    .orderBy(desc(itemChanges.changedAt));
}

/** How many items need sorting in the open period, for the line on Home (SPEC.md rule 12). */
export async function countToSort(userId: string, groupId: string): Promise<number> {
  await assertMember(userId, groupId);
  const rules = await rulesForGroup(groupId);
  const open = await openPeriodItems(groupId);
  return open.filter((i) => i.categoryId === null || rules.get(i.categoryId) === null).length;
}
