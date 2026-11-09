/** Tests for src/domain/receipts.ts and parseAmount in src/domain/money.ts (SPEC.md rules 6 to 9). */
import { describe, expect, it } from "vitest";
import continente from "../fixtures/reading-continente.json";
import usReceipt from "../fixtures/reading-us-tax-discount.json";
import { parseAmount } from "@/domain/money";
import { findDuplicate, matchCategory, parseReading, receiptNumberKey, receiptStatus, sumCheck, validateReview } from "@/domain/receipts";

describe("parseAmount", () => {
  it("reads both decimal styles", () => {
    expect(parseAmount("12,90")).toBe(1290);
    expect(parseAmount("12.90")).toBe(1290);
    expect(parseAmount("1.234,50")).toBe(123450);
    expect(parseAmount("1,234.50")).toBe(123450);
    expect(parseAmount("12")).toBe(1200);
    expect(parseAmount("0,5")).toBe(50);
    expect(parseAmount("€ 12,90")).toBe(1290);
  });
  it("treats three digits after a separator as thousands", () => {
    expect(parseAmount("1.234")).toBe(123400);
  });
  it("keeps the minus sign for discounts", () => {
    expect(parseAmount("-1,10")).toBe(-110);
    expect(parseAmount("-0")).toBe(0);
  });
  it("refuses text that is not an amount", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1-2")).toBeNull();
    expect(parseAmount("9999999999")).toBeNull();
  });
});

describe("parseReading", () => {
  it("reads a clean Portuguese receipt", () => {
    const r = parseReading(continente);
    expect(r.storeName).toBe("Continente");
    expect(r.purchaseDate).toBe("2026-09-10");
    expect(r.totalCents).toBe(1290);
    expect(r.items).toHaveLength(7);
    expect(r.items[6]).toEqual({ name: "Saco Plastico", priceCents: 10, discountCents: null, category: null });
    // The Twix line is already the price paid; its discount is kept for information only.
    expect(r.items[5]).toMatchObject({ name: "Snack Twix", priceCents: 108, discountCents: 37 });
    expect(sumCheck(r.items.map((i) => i.priceCents), r.totalCents).differenceCents).toBe(0);
  });
  it("attaches item discounts, keeps a voucher as a negative line and tax as an item, drops broken lines and a false date", () => {
    const r = parseReading(usReceipt);
    expect(r.storeName).toBe("Trader Joe's");
    expect(r.purchaseDate).toBeNull();
    expect(r.items.map((i) => i.name)).toEqual(["Bananas", "Oat Milk", "Coffee Beans", "Store voucher", "Sales tax"]);
    // A discount written as negative is still stored as a positive amount.
    expect(r.items[2]).toMatchObject({ priceCents: 1199, discountCents: 100 });
    expect(r.items[3].priceCents).toBe(-200);
    expect(r.items[4]).toEqual({ name: "Sales tax", priceCents: 190, discountCents: null, category: "Tax" });
    expect(sumCheck(r.items.map((i) => i.priceCents), r.totalCents)).toEqual({ itemsCents: 1837, differenceCents: 0 });
  });
  it("throws when there is nothing usable, so the receipt can be retried", () => {
    expect(() => parseReading(null)).toThrow();
    expect(() => parseReading({ items: [] })).toThrow();
    expect(() => parseReading({ items: [{ name: "x" }] })).toThrow();
  });
});

describe("sumCheck", () => {
  it("has no difference when the total is unknown", () => {
    expect(sumCheck([100, 200], null)).toEqual({ itemsCents: 300, differenceCents: null });
  });
});

describe("matchCategory", () => {
  const cats = [{ id: "c1", name: "Eggs" }, { id: "c2", name: "Milk" }];
  it("matches ignoring capitals and spaces", () => {
    expect(matchCategory(" eggs ", cats)).toEqual({ categoryId: "c1", proposed: null });
  });
  it("proposes a new name, so oat milk is not filed as milk", () => {
    expect(matchCategory("Oat milk", cats)).toEqual({ categoryId: null, proposed: "Oat milk" });
  });
  it("leaves an item with no name unsorted", () => {
    expect(matchCategory(null, cats)).toBeNull();
  });
});

describe("validateReview", () => {
  const item = { name: "Bread", priceCents: 149, discountCents: null, categoryId: null, proposedCategory: null };
  it("allows unsorted items", () => {
    expect(validateReview({ storeName: "Lidl", purchaseDate: null, items: [item] })).toEqual({});
  });
  it("flags empty names, bad dates and two categories on one line", () => {
    const e = validateReview({
      storeName: "Lidl",
      purchaseDate: "2026-02-30",
      items: [{ ...item, name: " " }, { ...item, categoryId: "c1", proposedCategory: "New" }, { ...item, discountCents: -5 }],
    });
    expect(e["item.2"]).toBeDefined();
    expect(e.purchaseDate).toBeDefined();
    expect(e["item.0"]).toBeDefined();
    expect(e["item.1"]).toBeDefined();
  });
  it("needs at least one item", () => {
    expect(validateReview({ storeName: "", purchaseDate: null, items: [] }).items).toBeDefined();
  });
});

describe("receiptStatus", () => {
  it("names what to do next", () => {
    expect(receiptStatus("ready", 0).label).toBe("Review and save");
    expect(receiptStatus("saved", 1)).toEqual({ label: "1 item unsorted", tone: "act" });
    expect(receiptStatus("saved", 0).tone).toBe("done");
    expect(receiptStatus("failed", 0).tone).toBe("error");
  });
});


describe("findDuplicate", () => {
  const saved = [
    { id: "1", storeName: "Intermarché", purchaseDate: "2026-10-18", totalCents: 2345, receiptNumber: "FS 0123/4567" },
    { id: "2", storeName: "Lidl", purchaseDate: "2026-10-20", totalCents: 1000, receiptNumber: null },
  ];
  it("normalises receipt numbers", () => {
    expect(receiptNumberKey(" fs 0123/4567 ")).toBe("FS0123/4567");
    expect(receiptNumberKey("  ")).toBeNull();
  });
  it("blocks the same store and receipt number, whatever the date or total", () => {
    const r = findDuplicate({ storeName: "intermarché", purchaseDate: null, totalCents: null, receiptNumber: "fs0123/4567" }, saved);
    expect(r?.kind).toBe("block");
    expect(r?.match.id).toBe("1");
  });
  it("does not match the same number at another store", () => {
    expect(findDuplicate({ storeName: "Pingo Doce", purchaseDate: null, totalCents: null, receiptNumber: "FS 0123/4567" }, saved)).toBeNull();
  });
  it("warns on same store, date and total when there is no number to compare", () => {
    const r = findDuplicate({ storeName: "Lidl", purchaseDate: "2026-10-20", totalCents: 1000, receiptNumber: "X1" }, saved);
    expect(r?.kind).toBe("warn");
  });
  it("does not warn when both receipts have different numbers", () => {
    expect(findDuplicate({ storeName: "Intermarché", purchaseDate: "2026-10-18", totalCents: 2345, receiptNumber: "FS 9999/1" }, saved)).toBeNull();
  });
});
