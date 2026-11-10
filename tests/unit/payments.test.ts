/** Tests for src/domain/payments.ts (SPEC.md rules 22a, 24 to 26). */
import { describe, expect, it } from "vitest";
import { checkPayment, debtStatus, isSettled, yearTotals } from "@/domain/payments";

const lines = [{ from: "izu", to: "butch", cents: 1153 }];

describe("debtStatus", () => {
  it("counts only confirmed payments as paid, and keeps waiting ones out of the cap", () => {
    const d = debtStatus(lines, [
      { from: "izu", to: "butch", amountCents: 500, confirmed: true },
      { from: "izu", to: "butch", amountCents: 300, confirmed: false },
    ]);
    expect(d[0]).toMatchObject({ confirmedCents: 500, pendingCents: 300, leftCents: 653, capCents: 353 });
  });
});

describe("checkPayment", () => {
  const debts = debtStatus(lines, [{ from: "izu", to: "butch", amountCents: 500, confirmed: true }]);
  it("allows a part payment up to what is left", () => {
    expect(checkPayment({ from: "izu", to: "butch", amountCents: 300 }, debts)).toBeNull();
    expect(checkPayment({ from: "izu", to: "butch", amountCents: 653 }, debts)).toBeNull();
  });
  it("refuses more than is left, zero, and the wrong direction", () => {
    expect(checkPayment({ from: "izu", to: "butch", amountCents: 654 }, debts)).not.toBeNull();
    expect(checkPayment({ from: "izu", to: "butch", amountCents: 0 }, debts)).not.toBeNull();
    expect(checkPayment({ from: "butch", to: "izu", amountCents: 100 }, debts)).not.toBeNull();
  });
});

describe("isSettled", () => {
  it("is settled only when confirmed payments cover everything", () => {
    expect(isSettled(debtStatus(lines, [{ from: "izu", to: "butch", amountCents: 1153, confirmed: false }]))).toBe(false);
    expect(isSettled(debtStatus(lines, [
      { from: "izu", to: "butch", amountCents: 1000, confirmed: true },
      { from: "izu", to: "butch", amountCents: 153, confirmed: true },
    ]))).toBe(true);
  });
  it("treats a period with nothing owed as settled", () => {
    expect(isSettled(debtStatus([], []))).toBe(true);
  });
});

describe("yearTotals", () => {
  it("adds confirmed payments per pair for the year", () => {
    const t = yearTotals(
      [
        { from: "izu", to: "butch", amountCents: 500, confirmed: true, paidOn: "2026-10-02" },
        { from: "izu", to: "butch", amountCents: 653, confirmed: true, paidOn: "2026-11-12" },
        { from: "izu", to: "butch", amountCents: 999, confirmed: false, paidOn: "2026-11-12" },
        { from: "izu", to: "butch", amountCents: 100, confirmed: true, paidOn: "2025-12-30" },
      ],
      2026,
    );
    expect(t).toEqual([{ from: "izu", to: "butch", cents: 1153 }]);
  });
});
