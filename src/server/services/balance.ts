/**
 * Balance service: who owes whom in the group's open period (screen 5, SPEC.md rules 15 to 17).
 *
 * Why it matters: this is where the receipts and rules turn into money. The amounts are worked out
 * each time from the current items and rules (src/domain/balance.ts), so a rule change or a moved
 * item shows at once for every item in the open period (rule 13a). Members only (architecture
 * rule 4). Closing a period and agreeing come in step 5; recording payments in step 6.
 */

import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { receipts } from "@/server/db/schema";
import { computeBalance, netFor } from "@/domain/balance";
import { getGroupForMember } from "./groups";
import { openPeriodItems, rulesForGroup } from "./categories";

/**
 * The open period's balance: netted lines with names, the user's own position (positive: owed,
 * negative: owes), the items left out (unsorted, no rule), and how many receipts are in the period.
 */
export async function getOpenBalance(userId: string, groupId: string) {
  const { group, members, openLedger } = await getGroupForMember(userId, groupId);
  const memberIds = members.map((m) => m.id);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";
  const rules = await rulesForGroup(groupId);
  const openItems = await openPeriodItems(groupId);
  const result = computeBalance(
    openItems.map((i) => ({ priceCents: i.priceCents, payerId: i.payerId, categoryId: i.categoryId, rule: i.categoryId ? rules.get(i.categoryId) ?? null : null })),
    memberIds,
  );
  const [{ receiptCount }] = openLedger
    ? await db.select({ receiptCount: count() }).from(receipts).where(and(eq(receipts.ledgerId, openLedger.id), eq(receipts.status, "saved")))
    : [{ receiptCount: 0 }];
  return {
    currency: group.currency,
    openLedger,
    lines: result.lines.map((l) => ({ ...l, fromName: nameOf(l.from), toName: nameOf(l.to) })),
    myNet: netFor(userId, result.lines),
    unsortedCount: result.unsortedCount,
    noRuleCount: result.noRuleCount,
    receiptCount,
  };
}
