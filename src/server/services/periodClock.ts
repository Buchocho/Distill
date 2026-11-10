/**
 * Closing periods on time (SPEC.md rule 19).
 *
 * What it holds: the date the app treats as "today" for a request, and the step that closes a
 * group's open period once its last day has passed and opens the next one.
 *
 * Why it matters: there is no background job that closes periods; closing is checked whenever
 * group data is loaded (rule 19), so the app is always on the right period when someone looks.
 * "Today" is the device's date (rule 2c): the browser stores it in the distill_today cookie as the
 * app loads (src/components/DeviceDate.tsx). Without the cookie, or with a date more than a day
 * from the server's, the server's UTC date is used. Kept apart from groups.ts so that groups.ts
 * can call it without a loop between the two files.
 */

import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { groups, ledgers } from "@/server/db/schema";
import { isValidLocalDate, utcToday } from "@/domain/groups";
import { periodForToday } from "@/domain/periods";
import type { CloseRule } from "@/domain/ledgers";

/** Name of the cookie holding the device's date. Also used by src/components/DeviceDate.tsx. */
export const TODAY_COOKIE = "distill_today";

/** Today's date for this request: the device's date when the browser sent a sensible one, else UTC. */
export async function requestToday(): Promise<string> {
  try {
    const { cookies } = await import("next/headers");
    const sent = (await cookies()).get(TODAY_COOKIE)?.value ?? "";
    return isValidLocalDate(sent) ? sent : utcToday();
  } catch {
    // Outside a request (for example a script): no cookies to read.
    return utcToday();
  }
}

/**
 * Closes the group's open period if its last day is before today, and opens the period that
 * contains today (rules 18, 19 and 23: the next period opens whether or not anyone agreed).
 * Safe to call often and from two requests at once: the database allows one open period per group,
 * so a second attempt finds the work done.
 */
export async function ensurePeriods(groupId: string, today: string): Promise<void> {
  const [open] = await db.select().from(ledgers).where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "open")));
  if (!open || open.endsOn >= today) return;
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const next = periodForToday(open.endsOn, today, { rule: group.closeRule as CloseRule, day: group.closeDay });
  if (!next) return;
  try {
    await db.transaction(async (tx) => {
      const closed = await tx
        .update(ledgers)
        .set({ status: "closed", closedAt: new Date() })
        .where(and(eq(ledgers.id, open.id), eq(ledgers.status, "open")))
        .returning({ id: ledgers.id });
      if (closed.length === 0) return; // Another request closed it first.
      await tx.insert(ledgers).values({ groupId, startsOn: next.startsOn, endsOn: next.endsOn });
    });
  } catch (error) {
    // Two requests closing at the same moment: the one-open-period rule stops the second. Fine.
    console.warn("ensurePeriods: already handled", groupId, error);
  }
}
