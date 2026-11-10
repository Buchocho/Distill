/** Tests for src/domain/receipts.ts and parseAmount in src/domain/money.ts (SPEC.md rules 6 to 9). */
import { describe, expect, it } from "vitest";
import continente from "../fixtures/reading-continente.json";
import usReceipt from "../fixtures/reading-us-tax-discount.json";
import { parseAmount } from "@/domain/money";
import { findDuplicate, matchCategory, parseReading, receiptNumberKey, receiptStatus, readingBlockedBy, reconcileTax, shownStatus, spreadTax, storeKey, suggestPrice, sumCheck, validateReview } from "@/domain/receipts";

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
    expect(r.items[6]).toEqual({ name: "Saco Plastico", priceCents: 10, discountCents: null, category: null, flag: null });
    // The Twix line is already the price paid; its discount is kept for information only.
    expect(r.items[5]).toMatchObject({ name: "Snack Twix", priceCents: 108, discountCents: 37 });
    expect(sumCheck(r.items.map((i) => i.priceCents), r.totalCents).differenceCents).toBe(0);
  });
  it("attaches item discounts, keeps a voucher as a negative line and tax as an item, drops nameless lines and a false date, keeps an unreadable price as missing", () => {
    const r = parseReading(usReceipt);
    expect(r.storeName).toBe("Trader Joe's");
    expect(r.purchaseDate).toBeNull();
    expect(r.items.map((i) => i.name)).toEqual(["Bananas", "Oat Milk", "Coffee Beans", "Store voucher", "Sales tax", "Unreadable line"]);
    // A price that cannot be read is never made up: it is left for the person to fill in (rule 8a).
    expect(r.items[5]).toMatchObject({ priceCents: 0, flag: "missing" });
    // A discount written as negative is still stored as a positive amount.
    expect(r.items[2]).toMatchObject({ priceCents: 1199, discountCents: 100 });
    expect(r.items[3].priceCents).toBe(-200);
    expect(r.items[4]).toEqual({ name: "Sales tax", priceCents: 190, discountCents: null, category: "Tax", flag: null });
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
  it("still warns when the numbers differ but store, date and total match (a misread number)", () => {
    const misread = { storeName: "Continente", purchaseDate: "2026-11-08", totalCents: 1290, receiptNumber: "FS AMM004/514739" };
    const r = findDuplicate({ ...misread, receiptNumber: "FS AMW004/514739" }, [{ id: "c", ...misread }]);
    expect(r?.kind).toBe("warn");
  });
  it("does not match a different shop on another day", () => {
    expect(findDuplicate({ storeName: "Intermarché", purchaseDate: "2026-10-19", totalCents: 2345, receiptNumber: "FS 9999/1" }, saved)).toBeNull();
  });
  it("compares store names without accents or punctuation", () => {
    expect(storeKey("Intermarché")).toBe(storeKey("INTERMARCHE"));
    expect(storeKey("Pingo-Doce ")).toBe("pingo doce");
    const r = findDuplicate({ storeName: "Intermarche", purchaseDate: null, totalCents: null, receiptNumber: "FS 0123/4567" }, saved);
    expect(r?.kind).toBe("block");
  });
});

describe("shownStatus", () => {
  const now = new Date("2026-11-10T17:00:00Z");
  it("keeps a reading that started recently", () => {
    expect(shownStatus("reading", new Date("2026-11-10T16:59:30Z"), now)).toBe("reading");
  });
  it("shows a reading cut off by the time limit as failed, so Retry appears", () => {
    expect(shownStatus("reading", new Date("2026-11-10T16:58:00Z"), now)).toBe("failed");
    expect(shownStatus("reading", null, now)).toBe("failed");
  });
  it("leaves other statuses alone", () => {
    expect(shownStatus("ready", null, now)).toBe("ready");
    expect(shownStatus("saved", new Date("2026-11-01T00:00:00Z"), now)).toBe("saved");
  });
});

describe("unclear readings (rule 8a)", () => {
  it("keeps a line whose price could not be read, flagged missing, and flags unsure values", () => {
    const r = parseReading({
      store: "Coldstone Creamery Gateway",
      total: "10000.00",
      total_unclear: false,
      date: "2026-09-15",
      date_unclear: true,
      items: [
        { name: "FOUNDERS FAVOU", price: null },
        { name: "PLAIN WAFFLE", price: "900.00" },
        { name: "Tax", price: "1111.11", price_unclear: true },
      ],
    });
    expect(r.items.map((i) => [i.priceCents, i.flag])).toEqual([[0, "missing"], [90000, null], [111111, "unclear"]]);
    expect(r.dateUnclear).toBe(true);
    expect(r.totalUnclear).toBe(false);
  });

  it("suggests the one missing price from the total, tax added on top", () => {
    expect(suggestPrice([null, 90000, 111111], ["missing", null, "unclear"], 1000000)).toEqual({ index: 0, cents: 798889 });
  });

  it("suggests the one unclear price when none is missing and the sums disagree", () => {
    expect(suggestPrice([910, 90000, 111111], ["unclear", null, null], 1000000)).toEqual({ index: 0, cents: 798889 });
    // Already matching: nothing to suggest.
    expect(suggestPrice([798889, 90000, 111111], ["unclear", null, null], 1000000)).toBeNull();
  });

  it("does not guess with two doubtful prices, no total, or a result of zero or less", () => {
    expect(suggestPrice([null, null, 111111], ["missing", "missing", null], 1000000)).toBeNull();
    expect(suggestPrice([null, 90000], ["missing", null], null)).toBeNull();
    expect(suggestPrice([null, 90000], ["missing", null], 50000)).toBeNull();
  });
});

describe("tax inside the prices (rule 6a)", () => {
  const item = (name: string, priceCents: number, category: string | null = null, flag: "unclear" | "missing" | null = null) =>
    ({ name, priceCents, discountCents: null, category, flag });

  it("drops the tax line when the items alone make the total (the Coldstone receipt, read right)", () => {
    const r = reconcileTax([item("FOUNDERS FAVOU", 910000), item("PLAIN WAFFLE", 90000), item("Tax", 111111, "Tax")], 1000000, 888889, 111111, false);
    expect(r.items.map((i) => i.name)).toEqual(["FOUNDERS FAVOU", "PLAIN WAFFLE"]);
    expect(r.taxIncludedCents).toBe(111111);
  });

  it("keeps the tax line when it is added on top", () => {
    const r = reconcileTax([item("Bananas", 1000), item("Sales tax", 80, "Tax")], 1080, 1000, 80, false);
    expect(r.items).toHaveLength(2);
    expect(r.taxIncludedCents).toBeNull();
  });

  it("follows the reading's own answer when a price is missing, so the suggestion is right", () => {
    const r = reconcileTax([item("FOUNDERS FAVOU", 0, null, "missing"), item("PLAIN WAFFLE", 90000), item("Tax", 111111, "Tax")], 1000000, 888889, 111111, true);
    expect(r.items.map((i) => i.name)).toEqual(["FOUNDERS FAVOU", "PLAIN WAFFLE"]);
    // With the tax out, the one missing price is the total minus the waffle: 9,100.00.
    expect(suggestPrice([null, 90000], ["missing", null], 1000000)).toEqual({ index: 0, cents: 910000 });
  });

  it("reads the tax from the tax total when the reading did not list it as an item", () => {
    const r = reconcileTax([item("FOUNDERS FAVOU", 910000), item("PLAIN WAFFLE", 90000)], 1000000, 888889, 111111, true);
    expect(r.taxIncludedCents).toBe(111111);
    expect(r.items).toHaveLength(2);
  });
});

describe("spreadTax (rule 6b)", () => {
  const isTax = (i: { name: string }) => i.name === "Sales tax";
  it("spreads tax added on top over the items by price, keeping the total to the cent", () => {
    const r = spreadTax([{ name: "Shampoo", priceCents: 2000 }, { name: "Food", priceCents: 2000 }, { name: "Sales tax", priceCents: 320 }], isTax);
    expect(r.items.map((i) => [i.name, i.priceCents, i.taxShareCents])).toEqual([["Shampoo", 2160, 160], ["Food", 2160, 160]]);
    expect(r.taxCents).toBe(320);
  });
  it("rounds by largest remainder and leaves a voucher without tax", () => {
    const r = spreadTax([{ name: "A", priceCents: 100 }, { name: "B", priceCents: 200 }, { name: "Voucher", priceCents: -50 }, { name: "Sales tax", priceCents: 10 }], isTax);
    expect(r.items.map((i) => i.taxShareCents)).toEqual([3, 7, 0]);
    expect(r.items.reduce((n, i) => n + i.priceCents, 0)).toBe(260);
  });
  it("changes nothing without a tax line", () => {
    const r = spreadTax([{ name: "A", priceCents: 100 }], isTax);
    expect(r.items[0]).toEqual({ name: "A", priceCents: 100, taxShareCents: 0 });
  });
});

describe("readingBlockedBy (rule 10a)", () => {
  it("allows up to 20 readings a day, one at a time", () => {
    expect(readingBlockedBy(0, false)).toBeNull();
    expect(readingBlockedBy(19, false)).toBeNull();
    expect(readingBlockedBy(20, false)).toMatch(/20 receipts today/);
    expect(readingBlockedBy(3, true)).toMatch(/still being read/);
  });
});
