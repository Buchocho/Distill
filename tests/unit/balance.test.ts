/** Tests for src/domain/balance.ts (SPEC.md rules 15 to 17). */
import { describe, expect, it } from "vitest";
import { computeBalance, netFor } from "@/domain/balance";
import type { Rule } from "@/domain/rules";

const everyone: Rule = { kind: "everyone", shares: [] };
const payer: Rule = { kind: "payer", shares: [] };
const members = ["butch", "izu"];

describe("computeBalance", () => {
  it("splits shared items and charges the other person half", () => {
    const r = computeBalance([{ priceCents: 149, payerId: "butch", categoryId: "bread", rule: everyone }], members);
    // 149 split in two: 75 and 74 (largest remainder, first person first). Izu owes his part.
    expect(r.lines).toEqual([{ from: "izu", to: "butch", cents: 74 }]);
    expect(r.countedCount).toBe(1);
  });
  it("moves no money for Whoever paid, whoever bought it", () => {
    const r = computeBalance(
      [
        { priceCents: 108, payerId: "butch", categoryId: "choc", rule: payer },
        { priceCents: 108, payerId: "izu", categoryId: "choc", rule: payer },
      ],
      members,
    );
    expect(r.lines).toEqual([]);
  });
  it("nets debts in both directions to one line", () => {
    const r = computeBalance(
      [
        { priceCents: 1000, payerId: "butch", categoryId: "a", rule: everyone },
        { priceCents: 400, payerId: "izu", categoryId: "a", rule: everyone },
      ],
      members,
    );
    // Izu owes 5,00, Butch owes 2,00: netted to Izu owes Butch 3,00.
    expect(r.lines).toEqual([{ from: "izu", to: "butch", cents: 300 }]);
    expect(netFor("butch", r.lines)).toBe(300);
    expect(netFor("izu", r.lines)).toBe(-300);
  });
  it("uses fixed shares, including one person who did not pay", () => {
    const r = computeBalance(
      [{ priceCents: 280, payerId: "butch", categoryId: "coffee", rule: { kind: "shares", shares: [{ userId: "izu", bp: 10000 }] } }],
      members,
    );
    expect(r.lines).toEqual([{ from: "izu", to: "butch", cents: 280 }]);
  });
  it("leaves out unsorted items and items without a rule, and counts them", () => {
    const r = computeBalance(
      [
        { priceCents: 100, payerId: "butch", categoryId: null, rule: null },
        { priceCents: 100, payerId: "butch", categoryId: "bags", rule: null },
      ],
      members,
    );
    expect(r.lines).toEqual([]);
    expect(r.unsortedCount).toBe(1);
    expect(r.noRuleCount).toBe(1);
  });
  it("lets a voucher reduce what is owed", () => {
    const r = computeBalance(
      [
        { priceCents: 1000, payerId: "butch", categoryId: "a", rule: everyone },
        { priceCents: -200, payerId: "butch", categoryId: "a", rule: everyone },
      ],
      members,
    );
    expect(r.lines).toEqual([{ from: "izu", to: "butch", cents: 400 }]);
  });
});
