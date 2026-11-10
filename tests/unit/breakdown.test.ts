/** Tests for src/domain/breakdown.ts (the period breakdown approved on 10 Nov 2026). */
import { describe, expect, it } from "vitest";
import { computeBreakdown, splitText } from "@/domain/breakdown";
import { computeBalance, netFor } from "@/domain/balance";
import type { Rule } from "@/domain/rules";

const members = ["butch", "izu"];
const name = (id: string) => ({ butch: "Butch", izu: "Izu" })[id] ?? id;
const everyone: Rule = { kind: "everyone", shares: [] };
const payer: Rule = { kind: "payer", shares: [] };
const izuOnly: Rule = { kind: "shares", shares: [{ userId: "izu", bp: 10000 }] };
const milk: Rule = { kind: "shares", shares: [{ userId: "butch", bp: 2000 }, { userId: "izu", bp: 8000 }] };

const item = (categoryId: string, categoryName: string, priceCents: number, payerId: string, rule: Rule | null) =>
  ({ categoryId, categoryName, priceCents, payerId, rule, date: "2026-11-01", storeName: "Continente" });

const month = [
  item("bread", "Bread", 158, "butch", everyone),
  item("bread", "Bread", 158, "izu", everyone),
  item("milk", "Milk", 290, "butch", milk),
  item("choc", "Chocolate bars", 108, "butch", payer),
  item("choc", "Chocolate bars", 120, "izu", payer),
  item("clean", "Cleaning", 900, "butch", izuOnly),
  item("x", "Bags", 10, "butch", null),
];

describe("computeBreakdown", () => {
  const b = computeBreakdown(month, "butch", "butch", members, name);
  it("shows the person's share of each category, largest first", () => {
    expect(b.lines.map((l) => [l.name, l.shareCents])).toEqual([
      ["Bread", 158],
      ["Chocolate bars", 108],
      ["Milk", 58],
      ["Cleaning", 0],
    ]);
  });
  it("counts purchases and totals per category, leaving out items without a rule", () => {
    const bread = b.lines.find((l) => l.name === "Bread");
    expect(bread).toMatchObject({ timesBought: 2, totalCents: 316 });
    expect(b.lines.some((l) => l.name === "Bags")).toBe(false);
  });
  it("reconciles with the balance: paid minus share is the amount owed", () => {
    const balance = computeBalance(month.map((i) => ({ ...i })), members);
    expect(b.balanceCents).toBe(netFor("butch", balance.lines));
    expect(b.paidCents - b.shareCents).toBe(b.balanceCents);
  });
});

describe("splitText", () => {
  it("describes each kind of rule from the reader's side", () => {
    expect(splitText(everyone, ["butch"], "butch", "butch", members, name)).toBe("Split 50/50 with Izu");
    expect(splitText(everyone, ["butch"], "butch", "butch", ["butch", "izu", "sam"], name)).toBe("Split equally between 3");
    expect(splitText(izuOnly, ["butch"], "butch", "butch", members, name)).toBe("Izu pays 100%");
    expect(splitText(milk, ["butch"], "butch", "butch", members, name)).toBe("You 20% · Izu 80%");
    expect(splitText(payer, ["butch", "izu", "izu"], "butch", "butch", members, name)).toBe("Each pays for their own · you bought 1 of 3");
    expect(splitText(payer, ["butch", "butch"], "butch", "butch", members, name)).toBe("You pay 100%");
  });
  it("reads correctly when looking at the other person's statement", () => {
    expect(splitText(everyone, ["butch"], "izu", "butch", members, name)).toBe("Split 50/50 with you");
    expect(splitText(milk, ["butch"], "izu", "butch", members, name)).toBe("Izu 80% · You 20%");
  });
});
