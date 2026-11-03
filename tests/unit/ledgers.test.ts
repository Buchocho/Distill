import { describe, expect, it } from "vitest";
import { firstLedger, nextCloseDate, nextLedger, validateCloseSetting } from "@/domain/ledgers";

describe("nextCloseDate", () => {
  it("month_end gives the last day of the month", () => {
    expect(nextCloseDate({ rule: "month_end", day: null }, "2026-11-03")).toBe("2026-11-30");
    expect(nextCloseDate({ rule: "month_end", day: null }, "2028-02-10")).toBe("2028-02-29");
    expect(nextCloseDate({ rule: "month_end", day: null }, "2026-10-31")).toBe("2026-10-31");
  });

  it("month_day uses this month if the day has not passed, else next month", () => {
    expect(nextCloseDate({ rule: "month_day", day: 15 }, "2026-11-03")).toBe("2026-11-15");
    expect(nextCloseDate({ rule: "month_day", day: 15 }, "2026-11-15")).toBe("2026-11-15");
    expect(nextCloseDate({ rule: "month_day", day: 2 }, "2026-11-03")).toBe("2026-12-02");
    expect(nextCloseDate({ rule: "month_day", day: 2 }, "2026-12-20")).toBe("2027-01-02");
  });

  it("weekly gives the next chosen weekday, today included", () => {
    // 2026-11-03 is a Tuesday (Monday = 0, so Tuesday = 1).
    expect(nextCloseDate({ rule: "weekly", day: 1 }, "2026-11-03")).toBe("2026-11-03");
    expect(nextCloseDate({ rule: "weekly", day: 6 }, "2026-11-03")).toBe("2026-11-08");
    expect(nextCloseDate({ rule: "weekly", day: 0 }, "2026-11-03")).toBe("2026-11-09");
  });

  it("rejects bad input", () => {
    expect(() => nextCloseDate({ rule: "month_day", day: 31 }, "2026-11-03")).toThrow();
    expect(() => nextCloseDate({ rule: "month_end", day: null }, "2026-02-30")).toThrow();
    expect(() => nextCloseDate({ rule: "weekly", day: 7 }, "2026-11-03")).toThrow();
  });
});

describe("ledger ranges", () => {
  it("the first ledger starts today", () => {
    expect(firstLedger({ rule: "month_end", day: null }, "2026-11-03")).toEqual({
      startsOn: "2026-11-03",
      endsOn: "2026-11-30",
    });
  });

  it("the next ledger starts the day after the previous one ends", () => {
    expect(nextLedger({ rule: "month_end", day: null }, "2026-11-30")).toEqual({
      startsOn: "2026-12-01",
      endsOn: "2026-12-31",
    });
    expect(nextLedger({ rule: "weekly", day: 6 }, "2026-11-08")).toEqual({
      startsOn: "2026-11-09",
      endsOn: "2026-11-15",
    });
  });
});

describe("validateCloseSetting", () => {
  it("accepts valid settings and explains invalid ones", () => {
    expect(validateCloseSetting({ rule: "month_end", day: null })).toBeNull();
    expect(validateCloseSetting({ rule: "month_day", day: 28 })).toBeNull();
    expect(validateCloseSetting({ rule: "month_day", day: 0 })).toMatch(/1 and 28/);
    expect(validateCloseSetting({ rule: "weekly", day: null })).toMatch(/day of the week/);
  });
});

import { daysUntil, describeClose } from "@/domain/ledgers";

describe("describeClose and daysUntil", () => {
  it("describes each rule in plain words", () => {
    expect(describeClose({ rule: "month_end", day: null })).toBe("Accounts close on the last day of the month");
    expect(describeClose({ rule: "month_day", day: 15 })).toBe("Accounts close on day 15 of each month");
    expect(describeClose({ rule: "weekly", day: 6 })).toBe("Accounts close every Sunday");
  });
  it("counts days and never goes below zero", () => {
    expect(daysUntil("2026-11-03", "2026-11-30")).toBe(27);
    expect(daysUntil("2026-11-30", "2026-11-03")).toBe(0);
  });
});
