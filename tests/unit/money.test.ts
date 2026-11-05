// Unit tests for src/domain/money.ts: splitting cents (SPEC.md rule 15) and euro formatting.

import { describe, expect, it } from "vitest";
import { formatCents, splitCents } from "@/domain/money";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("splitCents", () => {
  it("splits evenly when it divides", () => {
    expect(splitCents(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  it("gives leftover cents to the largest remainders, earliest first on ties", () => {
    expect(splitCents(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitCents(149, [1, 1, 1])).toEqual([50, 50, 49]);
  });

  it("follows basis point shares", () => {
    expect(splitCents(1000, [3000, 7000])).toEqual([300, 700]);
    expect(splitCents(999, [3000, 7000])).toEqual([300, 699]);
  });

  it("always adds up to the amount", () => {
    for (const amount of [1, 7, 99, 1290, 12345]) {
      for (const weights of [[1, 1, 1], [3333, 3333, 3334], [1, 2], [5000, 2500, 2500]]) {
        expect(sum(splitCents(amount, weights))).toBe(amount);
      }
    }
  });

  it("handles negative amounts for discount lines", () => {
    const parts = splitCents(-100, [1, 1, 1]);
    expect(parts).toEqual([-34, -33, -33]);
    expect(sum(parts)).toBe(-100);
  });

  it("gives zero to a zero weight", () => {
    expect(splitCents(100, [1, 0])).toEqual([100, 0]);
  });

  it("returns zeros for a zero amount", () => {
    expect(splitCents(0, [1, 1])).toEqual([0, 0]);
  });

  it("rejects bad input", () => {
    expect(() => splitCents(10.5, [1])).toThrow();
    expect(() => splitCents(10, [])).toThrow();
    expect(() => splitCents(10, [0, 0])).toThrow();
    expect(() => splitCents(10, [-1, 2])).toThrow();
  });
});

describe("formatCents", () => {
  it("formats with a comma decimal", () => {
    expect(formatCents(1290)).toBe("12,90");
    expect(formatCents(5)).toBe("0,05");
    expect(formatCents(0)).toBe("0,00");
    expect(formatCents(-110)).toBe("-1,10");
  });
});
