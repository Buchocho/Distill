/**
 * Period (ledger) dates.
 *
 * What it holds: the date logic for periods. A period is called a "ledger" in the code
 * and database, and a "period" on screen. This file works out when a period ends, what
 * the next one is, and the plain sentences shown about it.
 *
 * Why it matters: the group settles up once per period, on a date it chose. If these
 * dates are wrong, receipts land in the wrong period and people are asked to agree
 * to the wrong amount. To change how close dates work, change this file.
 *
 * Business rules: SPEC.md rules 18 (close rule options), 19 (a period runs start to end
 * date inclusive, the next opens the following day), story US6.
 *
 * Dates are text in the form YYYY-MM-DD and the calendar arithmetic is done in UTC, so a server
 * in another time zone gives the same answer. The starting "today" must be the group's own date,
 * the date on the user's device (SPEC.md rule 2c). Pure functions. Tests: tests/unit/ledgers.test.ts
 */

/** The three ways a group can choose to close its accounts (SPEC.md rule 18). */
export type CloseRule = "month_end" | "month_day" | "weekly";

/** A group's close choice: the rule plus, where needed, which day. */
export interface CloseSetting {
  rule: CloseRule;
  /** null for month_end; 1 to 28 for month_day; 0 (Monday) to 6 (Sunday) for weekly. */
  day: number | null;
}

/** A period's first and last day, both included. */
export interface LedgerRange {
  startsOn: string;
  endsOn: string;
}

/** Reads a YYYY-MM-DD date and rejects impossible dates such as 2026-02-30. */
function parse(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Invalid date: ${iso}`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || format(d) !== iso) throw new Error(`Invalid date: ${iso}`);
  return d;
}

/** Writes a date back as YYYY-MM-DD. */
function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Moves a date forward (or back, with a negative number) by whole days. */
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * Checks a close choice. Returns the message to show the user, or null when it is valid.
 *
 * Day of the month stops at 28 on purpose: every month has a 28th, so a group never has a
 * month with no close date. The database has the same check (groups_close_day_valid).
 */
export function validateCloseSetting(s: CloseSetting): string | null {
  if (s.rule === "month_end") return s.day === null ? null : "Last day of the month takes no day.";
  if (s.rule === "month_day") {
    return Number.isInteger(s.day) && s.day !== null && s.day >= 1 && s.day <= 28
      ? null
      : "Pick a day between 1 and 28.";
  }
  if (s.rule === "weekly") {
    return Number.isInteger(s.day) && s.day !== null && s.day >= 0 && s.day <= 6
      ? null
      : "Pick a day of the week.";
  }
  return "Unknown close rule.";
}

/**
 * The first close date on or after a given date (that date counts).
 * Example: weekly on Sunday, from Friday 6 Nov 2026, gives Sunday 8 Nov 2026.
 * A period created on its own close day therefore closes that same day.
 */
export function nextCloseDate(setting: CloseSetting, fromIso: string): string {
  const error = validateCloseSetting(setting);
  if (error) throw new Error(error);
  const from = parse(fromIso);
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();

  // Last day of the month: day 0 of next month is the last day of this month.
  if (setting.rule === "month_end") {
    return format(new Date(Date.UTC(y, m + 1, 0)));
  }
  // A day of the month: this month's day if it has not passed, otherwise next month's.
  if (setting.rule === "month_day") {
    const day = setting.day as number;
    const thisMonth = new Date(Date.UTC(y, m, day));
    return format(thisMonth >= from ? thisMonth : new Date(Date.UTC(y, m + 1, day)));
  }
  // Weekly: the app counts Monday as 0; JavaScript counts Sunday as 0, so convert first.
  const target = setting.day as number;
  const current = (from.getUTCDay() + 6) % 7;
  return format(addDays(from, (target - current + 7) % 7));
}

/** The first period of a new group: starts the day it is created, ends on the next close date. */
export function firstLedger(setting: CloseSetting, todayIso: string): LedgerRange {
  return { startsOn: todayIso, endsOn: nextCloseDate(setting, todayIso) };
}

/**
 * The period that follows one ending on a given date: starts the next day (SPEC.md rule 19).
 * Used when a period closes. A change to the close rule only affects periods made after it
 * (SPEC.md rule 18), because the rule is read here when the next period is made.
 */
export function nextLedger(setting: CloseSetting, previousEndsOn: string): LedgerRange {
  const startsOn = format(addDays(parse(previousEndsOn), 1));
  return { startsOn, endsOn: nextCloseDate(setting, startsOn) };
}

/** Day names in the app's order, Monday first, matching CloseSetting.day. */
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The close choice as a sentence for the screen, for example
 * "Accounts close on the last day of the month". Shown on the Join screen.
 */
export function describeClose(setting: CloseSetting): string {
  if (setting.rule === "month_end") return "Accounts close on the last day of the month";
  if (setting.rule === "month_day") return `Accounts close on day ${setting.day} of each month`;
  return `Accounts close every ${WEEKDAYS[setting.day ?? 0]}`;
}

/**
 * Whole days left until a period ends, never below 0. Shown as "closes in 3 days" on Home
 * and Balance. 0 means it closes today.
 */
export function daysUntil(todayIso: string, endsOnIso: string): number {
  return Math.max(0, Math.round((parse(endsOnIso).getTime() - parse(todayIso).getTime()) / 86_400_000));
}
