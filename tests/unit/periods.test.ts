/** Tests for src/domain/periods.ts (SPEC.md rules 18 to 23). */
import { describe, expect, it } from "vitest";
import { agreeBlockedBy, debtWords, periodForToday, periodLabel, periodStage, positionWords } from "@/domain/periods";

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

describe("positionWords and debtWords", () => {
  const me = { id: "me", name: "Buchi" };
  const izu = { id: "izu", name: "Izu" };
  const sam = { id: "sam", name: "Sam" };

  it("uses the present until the period is settled", () => {
    expect(positionWords(110, "agreed")).toBe("You are owed");
    expect(positionWords(-110, "closed")).toBe("You owe");
    expect(positionWords(0, "open")).toBe("You are all square");
    expect(debtWords(izu, me, "me", "agreed")).toBe("Izu owes you");
    expect(debtWords(me, izu, "me", "agreed")).toBe("You owe Izu");
    expect(debtWords(izu, sam, "me", "agreed")).toBe("Izu owes Sam");
  });

  it("uses the past once settled", () => {
    expect(positionWords(110, "settled")).toBe("You were owed");
    expect(positionWords(-110, "settled")).toBe("You owed");
    expect(positionWords(0, "settled")).toBe("You were all square");
    expect(debtWords(izu, me, "me", "settled")).toBe("Izu owed you");
    expect(debtWords(me, izu, "me", "settled")).toBe("You owed Izu");
    expect(debtWords(izu, sam, "me", "settled")).toBe("Izu owed Sam");
  });
});

describe("periodLabel", () => {
  it("names a whole calendar month by the month", () => {
    expect(periodLabel("2026-10-01", "2026-10-31", 2026)).toBe("October");
    expect(periodLabel("2026-02-01", "2026-02-28", 2026)).toBe("February");
    expect(periodLabel("2025-10-01", "2025-10-31", 2026)).toBe("October 2025");
  });

  it("names any other period by its dates", () => {
    expect(periodLabel("2026-11-04", "2026-11-10", 2026)).toBe("4–10 Nov");
    expect(periodLabel("2026-10-11", "2026-11-10", 2026)).toBe("11 Oct – 10 Nov");
    expect(periodLabel("2026-10-26", "2026-10-31", 2026)).toBe("26–31 Oct");
    expect(periodLabel("2026-11-10", "2026-11-10", 2026)).toBe("10 Nov");
    expect(periodLabel("2025-11-04", "2025-11-10", 2026)).toBe("4–10 Nov 2025");
    expect(periodLabel("2026-12-28", "2027-01-03", 2026)).toBe("28 Dec 2026 – 3 Jan 2027");
  });
});
