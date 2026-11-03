// Ledger (period) dates. Pure functions on ISO dates (YYYY-MM-DD), computed in UTC.

export type CloseRule = "month_end" | "month_day" | "weekly";

export interface CloseSetting {
  rule: CloseRule;
  /** null for month_end; 1 to 28 for month_day; 0 (Monday) to 6 (Sunday) for weekly. */
  day: number | null;
}

export interface LedgerRange {
  startsOn: string;
  endsOn: string;
}

function parse(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Invalid date: ${iso}`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || format(d) !== iso) throw new Error(`Invalid date: ${iso}`);
  return d;
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Checks a close setting, returning an error message or null when valid. */
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

/** The first close date on or after `fromIso`, inclusive. */
export function nextCloseDate(setting: CloseSetting, fromIso: string): string {
  const error = validateCloseSetting(setting);
  if (error) throw new Error(error);
  const from = parse(fromIso);
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();

  if (setting.rule === "month_end") {
    return format(new Date(Date.UTC(y, m + 1, 0)));
  }
  if (setting.rule === "month_day") {
    const day = setting.day as number;
    const thisMonth = new Date(Date.UTC(y, m, day));
    return format(thisMonth >= from ? thisMonth : new Date(Date.UTC(y, m + 1, day)));
  }
  // weekly: Monday = 0. JS getUTCDay: Sunday = 0.
  const target = setting.day as number;
  const current = (from.getUTCDay() + 6) % 7;
  return format(addDays(from, (target - current + 7) % 7));
}

/** The range of the first ledger of a group created on `todayIso`. */
export function firstLedger(setting: CloseSetting, todayIso: string): LedgerRange {
  return { startsOn: todayIso, endsOn: nextCloseDate(setting, todayIso) };
}

/** The ledger that follows one ending on `previousEndsOn`. */
export function nextLedger(setting: CloseSetting, previousEndsOn: string): LedgerRange {
  const startsOn = format(addDays(parse(previousEndsOn), 1));
  return { startsOn, endsOn: nextCloseDate(setting, startsOn) };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** A plain sentence for the close setting, for example "Accounts close on the last day of the month". */
export function describeClose(setting: CloseSetting): string {
  if (setting.rule === "month_end") return "Accounts close on the last day of the month";
  if (setting.rule === "month_day") return `Accounts close on day ${setting.day} of each month`;
  return `Accounts close every ${WEEKDAYS[setting.day ?? 0]}`;
}

/** Whole days from `todayIso` until `endsOnIso`, never negative. */
export function daysUntil(todayIso: string, endsOnIso: string): number {
  return Math.max(0, Math.round((parse(endsOnIso).getTime() - parse(todayIso).getTime()) / 86_400_000));
}
