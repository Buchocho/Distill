/** Tests for src/domain/dates.ts (SPEC.md rules 2c and 8). */
import { describe, expect, it } from "vitest";
import { dateLooksWrong, deviceToday, longDate } from "@/domain/dates";

describe("longDate", () => {
  it("writes day, short month and year", () => {
    expect(longDate("2026-09-28")).toBe("28 Sep 2026");
    expect(longDate("2026-10-01")).toBe("1 Oct 2026");
  });
});

describe("dateLooksWrong", () => {
  it("accepts recent dates", () => {
    expect(dateLooksWrong("2026-10-18", "2026-11-09")).toBe(false);
    expect(dateLooksWrong("2026-11-09", "2026-11-09")).toBe(false);
  });
  it("flags future dates and very old ones", () => {
    expect(dateLooksWrong("2026-11-10", "2026-11-09")).toBe(true);
    expect(dateLooksWrong("2018-10-26", "2026-11-09")).toBe(true);
  });
});

describe("deviceToday", () => {
  it("uses the local calendar date", () => {
    expect(deviceToday(new Date(2026, 10, 9, 23, 30))).toBe("2026-11-09");
  });
});
