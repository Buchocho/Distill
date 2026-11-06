// Unit tests for src/domain/groups.ts: New group form validation (story US1).

import { describe, expect, it } from "vitest";
import { isValidLocalDate, validateNewGroup } from "@/domain/groups";

/** A currency that passes, so each test only varies what it is about. */
const ok = { currency: "EUR" };

describe("validateNewGroup", () => {
  it("accepts a valid group", () => {
    expect(validateNewGroup({ name: "Rua das Flores 12", close: { rule: "month_end", day: null }, ...ok })).toEqual({});
  });
  it("requires a name and a valid close setting", () => {
    const e = validateNewGroup({ name: "   ", close: { rule: "month_day", day: 40 }, ...ok });
    expect(e.name).toBeDefined();
    expect(e.close).toBeDefined();
  });
  it("limits the name length", () => {
    expect(validateNewGroup({ name: "x".repeat(61), close: { rule: "month_end", day: null }, ...ok }).name).toBeDefined();
  });
});

describe("currency and local date (SPEC.md rules 2b, 2c)", () => {
  it("refuses a currency not on the list", () => {
    const e = validateNewGroup({ name: "Flat", close: { rule: "month_end", day: null }, currency: "JPY" });
    expect(e.currency).toBeDefined();
  });
  it("accepts the device's date up to one day either side of UTC", () => {
    // 1 Dec 02:00 UTC is still 30 Nov in Toronto and already 1 Dec in Lagos.
    const now = new Date("2026-12-01T02:00:00Z");
    expect(isValidLocalDate("2026-11-30", now)).toBe(true);
    expect(isValidLocalDate("2026-12-01", now)).toBe(true);
    expect(isValidLocalDate("2026-12-02", now)).toBe(true);
  });
  it("refuses dates further away or badly written", () => {
    const now = new Date("2026-12-01T02:00:00Z");
    expect(isValidLocalDate("2026-11-28", now)).toBe(false);
    expect(isValidLocalDate("2026-02-30", now)).toBe(false);
    expect(isValidLocalDate("1/12/2026", now)).toBe(false);
    expect(isValidLocalDate("", now)).toBe(false);
  });
});
