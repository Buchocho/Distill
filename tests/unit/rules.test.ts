/** Tests for src/domain/rules.ts (SPEC.md rules 11 to 13). */
import { describe, expect, it } from "vitest";
import { bpToPercent, describeRule, equalShares, percentToBp, validateRule, weightsFor } from "@/domain/rules";

const members = ["butch", "izu", "sam"];
const name = (id: string) => ({ butch: "Butch", izu: "Izu", sam: "Sam" })[id] ?? id;

describe("percentages", () => {
  it("reads whole and decimal percentages with a comma or a point", () => {
    expect(percentToBp("30")).toBe(3000);
    expect(percentToBp("33,33")).toBe(3333);
    expect(percentToBp("33.3")).toBe(3330);
    expect(percentToBp("100")).toBe(10000);
  });
  it("refuses anything that is not 0 to 100", () => {
    expect(percentToBp("101")).toBeNull();
    expect(percentToBp("-5")).toBeNull();
    expect(percentToBp("1.234")).toBeNull();
    expect(percentToBp("")).toBeNull();
  });
  it("shows basis points as percentages", () => {
    expect(bpToPercent(3000)).toBe("30");
    expect(bpToPercent(3333)).toBe("33,33");
  });
});

describe("equalShares", () => {
  it("always totals 100%", () => {
    expect(equalShares(members).map((s) => s.bp)).toEqual([3334, 3333, 3333]);
    expect(equalShares(["a", "b"]).map((s) => s.bp)).toEqual([5000, 5000]);
  });
});

describe("validateRule", () => {
  it("accepts the simple kinds without percentages", () => {
    expect(validateRule({ kind: "everyone", shares: [] }, members)).toBeNull();
    expect(validateRule({ kind: "payer", shares: [] }, members)).toBeNull();
  });
  it("accepts shares that total 100%", () => {
    expect(validateRule({ kind: "shares", shares: [{ userId: "butch", bp: 3000 }, { userId: "izu", bp: 7000 }] }, members)).toBeNull();
    expect(validateRule({ kind: "shares", shares: [{ userId: "izu", bp: 10000 }] }, members)).toBeNull();
  });
  it("refuses shares that do not total 100%, outsiders and repeats", () => {
    expect(validateRule({ kind: "shares", shares: [{ userId: "butch", bp: 3000 }] }, members)).toContain("30%");
    expect(validateRule({ kind: "shares", shares: [{ userId: "stranger", bp: 10000 }] }, members)).not.toBeNull();
    expect(validateRule({ kind: "shares", shares: [{ userId: "izu", bp: 5000 }, { userId: "izu", bp: 5000 }] }, members)).not.toBeNull();
    expect(validateRule({ kind: "shares", shares: [] }, members)).not.toBeNull();
  });
});

describe("describeRule", () => {
  it("names each kind", () => {
    expect(describeRule(null, name)).toBe("No rule yet");
    expect(describeRule({ kind: "everyone", shares: [] }, name)).toBe("Everyone equal");
    expect(describeRule({ kind: "payer", shares: [] }, name)).toBe("Whoever paid");
    expect(describeRule({ kind: "shares", shares: [{ userId: "izu", bp: 7000 }, { userId: "butch", bp: 3000 }] }, name)).toBe("Izu 70%, Butch 30%");
  });
});

describe("weightsFor", () => {
  it("gives whoever paid the whole item", () => {
    expect(weightsFor({ kind: "payer", shares: [] }, "izu", members)).toEqual([{ userId: "izu", bp: 1 }]);
  });
  it("gives everyone an equal weight", () => {
    expect(weightsFor({ kind: "everyone", shares: [] }, "izu", members)).toHaveLength(3);
  });
});
