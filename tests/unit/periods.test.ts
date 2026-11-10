/** Tests for src/domain/periods.ts (SPEC.md rules 18 to 23). */
import { describe, expect, it } from "vitest";
import { agreeBlockedBy, periodForToday, periodStage } from "@/domain/periods";

const monthEnd = { rule: "month_end" as const, day: null };

describe("periodStage", () => {
  it("follows the two stage settling", () => {
    expect(periodStage({ status: "open", agreedAt: null, settledAt: null })).toBe("open");
    expect(periodStage({ status: "closed", agreedAt: null, settledAt: null })).toBe("closed");
    expect(periodStage({ status: "closed", agreedAt: new Date(), settledAt: null })).toBe("agreed");
    expect(periodStage({ status: "closed", agreedAt: new Date(), settledAt: new Date() })).toBe("settled");
  });
});

describe("periodForToday", () => {
  it("keeps the open period until its last day has passed", () => {
    expect(periodForToday("2026-11-30", "2026-11-30", monthEnd)).toBeNull();
  });
  it("opens the next period the day after", () => {
    expect(periodForToday("2026-10-31", "2026-11-01", monthEnd)).toEqual({ startsOn: "2026-11-01", endsOn: "2026-11-30" });
  });
  it("skips periods nobody used", () => {
    expect(periodForToday("2026-08-31", "2026-11-10", monthEnd)).toEqual({ startsOn: "2026-11-01", endsOn: "2026-11-30" });
  });
  it("uses the close rule as it is now", () => {
    // Weekly on Sunday (6) after a month end close.
    expect(periodForToday("2026-10-31", "2026-11-02", { rule: "weekly", day: 6 })).toEqual({ startsOn: "2026-11-02", endsOn: "2026-11-08" });
  });
});

describe("agreeBlockedBy", () => {
  it("allows agreeing when everything is sorted", () => {
    expect(agreeBlockedBy(0, 0)).toBeNull();
  });
  it("says what is left", () => {
    expect(agreeBlockedBy(2, 1)).toContain("2 items to sort, 1 item without a rule");
  });
});
