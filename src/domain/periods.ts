/**
 * Period stages and closing: when a period closes, what can still change, and when it is frozen.
 *
 * What it holds: the stage of a period, which period should be open on a given date, and whether
 * a closed period can be agreed.
 *
 * Why it matters: settling happens in two stages, agreed with Maduabuchi on 10 Nov 2026:
 * - open: receipts are added (SPEC.md rule 5);
 * - closed: the close date has passed (rule 19). No new receipts. Leftover items can be sorted or
 *   deleted by their payer, rules can be set, and any such change clears the agreements given so
 *   far (rules 20, 22). The amounts follow the current rules;
 * - agreed (stage 1): every member has agreed. The amounts are frozen; later rule changes do not
 *   touch the period (rule 22a);
 * - settled (stage 2): every amount owed is confirmed paid (step 6). Read only.
 * Dates are YYYY-MM-DD and "today" is the device's date (rule 2c). Pure code.
 * Tests: tests/unit/periods.test.ts
 */

import { type CloseSetting, nextLedger, type LedgerRange } from "./ledgers";

export type PeriodStage = "open" | "closed" | "agreed" | "settled";

/** The stage of a period from its stored fields. */
export function periodStage(p: { status: string; agreedAt: Date | null; settledAt: Date | null }): PeriodStage {
  if (p.status === "open") return "open";
  if (p.settledAt) return "settled";
  if (p.agreedAt) return "agreed";
  return "closed";
}

/**
 * The period that should be open today, when the open one ended before today (SPEC.md rule 19),
 * or null when the open period is still current. Periods in between, when nobody used the app for
 * a while, are skipped: they had no receipts, so there is nothing to settle in them.
 * Follows the group's close rule as it is now, so a changed rule applies from here on (rule 18).
 */
export function periodForToday(openEndsOn: string, today: string, setting: CloseSetting): LedgerRange | null {
  if (openEndsOn >= today) return null;
  let next = nextLedger(setting, openEndsOn);
  // A period ends on or after its start, so this always moves forward and stops.
  while (next.endsOn < today) next = nextLedger(setting, next.endsOn);
  return next;
}

/**
 * Whether a closed period can be agreed (SPEC.md rule 21): no unsorted items and every category
 * used in it has a rule. Returns a reason when it cannot, for the screen.
 */
export function agreeBlockedBy(unsortedCount: number, noRuleCount: number): string | null {
  if (unsortedCount === 0 && noRuleCount === 0) return null;
  const parts = [
    unsortedCount > 0 ? `${unsortedCount} item${unsortedCount === 1 ? "" : "s"} to sort` : null,
    noRuleCount > 0 ? `${noRuleCount} item${noRuleCount === 1 ? "" : "s"} without a rule` : null,
  ].filter(Boolean);
  return `Agree opens when there are no items left to sort (${parts.join(", ")}).`;
}

/**
 * The reader's position in words, in the right tense for the period's stage: "You are owed",
 * "You owe", "You are all square"; once settled everything has been paid, so it is past:
 * "You were owed", "You owed", "You were all square" (decided 10 Nov 2026, rule 22a).
 */
export function positionWords(myNet: number, stage: PeriodStage): string {
  const past = stage === "settled";
  if (myNet > 0) return past ? "You were owed" : "You are owed";
  if (myNet < 0) return past ? "You owed" : "You owe";
  return past ? "You were all square" : "You are all square";
}

/**
 * One amount owed in words from the reader's side, in the period's tense: "Izu owes you",
 * "You owe Izu", "Izu owes Sam"; once settled "Izu owed you", "You owed Izu", "Izu owed Sam".
 */
export function debtWords(from: { id: string; name: string }, to: { id: string; name: string }, readerId: string, stage: PeriodStage): string {
  const verb = stage === "settled" ? "owed" : from.id === readerId ? "owe" : "owes";
  if (to.id === readerId) return `${from.name} ${verb} you`;
  if (from.id === readerId) return `You ${verb} ${to.name}`;
  return `${from.name} ${verb} ${to.name}`;
}

/** Short month names for period labels. */
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A period's name, from its dates (decided 10 Nov 2026). A period that is exactly one calendar
 * month is named by the month ("October"); any other period by its range ("4–10 Nov",
 * "11 Oct – 10 Nov"), so weekly periods in the same month never share a name. The year is added
 * when the period is not in `thisYear` or spans two years.
 */
export function periodLabel(startsOn: string, endsOn: string, thisYear: number): string {
  const [sy, sm, sd] = startsOn.split("-").map(Number);
  const [ey, em, ed] = endsOn.split("-").map(Number);
  // Day 0 of the next month is the last day of this month.
  const lastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  if (sy === ey && sm === em && sd === 1 && ed === lastDay) {
    return `${LONG_MONTHS[em - 1]}${ey !== thisYear ? ` ${ey}` : ""}`;
  }
  if (sy !== ey) return `${sd} ${SHORT_MONTHS[sm - 1]} ${sy} – ${ed} ${SHORT_MONTHS[em - 1]} ${ey}`;
  const year = ey !== thisYear ? ` ${ey}` : "";
  if (startsOn === endsOn) return `${ed} ${SHORT_MONTHS[em - 1]}${year}`;
  if (sm === em) return `${sd}–${ed} ${SHORT_MONTHS[em - 1]}${year}`;
  return `${sd} ${SHORT_MONTHS[sm - 1]} – ${ed} ${SHORT_MONTHS[em - 1]}${year}`;
}
