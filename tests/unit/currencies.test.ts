/** Tests for src/domain/currencies.ts and the currency formatting in src/domain/money.ts (SPEC.md rule 2b). */
import { describe, expect, it } from "vitest";
import { CURRENCIES, DEFAULT_CURRENCY, isSupportedCurrency } from "@/domain/currencies";
import { formatCents, formatMoney } from "@/domain/money";

describe("currency list", () => {
  it("has no duplicates and includes the default", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(isSupportedCurrency(DEFAULT_CURRENCY)).toBe(true);
  });

  it("only lists currencies shown with two decimals, so whole cents stay correct", () => {
    for (const { code } of CURRENCIES) {
      const digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
      expect(digits, code).toBe(2);
    }
  });

  it("accepts USD, CAD and NGN and refuses yen and unknown codes", () => {
    for (const c of ["USD", "CAD", "NGN", "GBP"]) expect(isSupportedCurrency(c)).toBe(true);
    for (const c of ["JPY", "KWD", "eur", "XYZ", ""]) expect(isSupportedCurrency(c)).toBe(false);
  });
});

describe("formatMoney", () => {
  it("keeps the Portuguese style for euros", () => {
    expect(formatMoney(1290, "EUR").replace(/\s/g, " ")).toBe("12,90 €");
  });
  it("uses the English style for other currencies", () => {
    expect(formatMoney(1290, "USD")).toBe("$12.90");
    expect(formatMoney(123450, "NGN")).toBe("₦1,234.50");
    expect(formatMoney(-110, "GBP")).toBe("-£1.10");
  });
  it("never rounds: large amounts stay exact", () => {
    expect(formatCents(900719925474099, "USD")).toBe("9,007,199,254,740.99");
  });
});

describe("formatCents with a currency", () => {
  it("prints the number without a symbol in that currency's style", () => {
    expect(formatCents(1290, "USD")).toBe("12.90");
    expect(formatCents(1290, "EUR")).toBe("12,90");
  });
});
