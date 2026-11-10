// Unit tests for the Balance line on Home (src/domain/home.ts): the most pressing thing first.

import { describe, expect, it } from "vitest";
import { balanceLine, needsAction, type BalanceSituation } from "@/domain/home";

const calm: BalanceSituation = { confirmFrom: [], declined: null, toAgree: null, toPay: null, closes: { month: "November", daysLeft: 28 } };

describe("balanceLine", () => {
  it("says when the period closes when nothing is waiting", () => {
    expect(balanceLine(calm)).toBe("November closes in 28 days");
    expect(balanceLine({ ...calm, closes: { month: "November", daysLeft: 1 } })).toBe("November closes in 1 day");
    expect(balanceLine({ ...calm, closes: { month: "November", daysLeft: 0 } })).toBe("November closes today");
    expect(needsAction(calm)).toBe(false);
  });

  it("puts payments to confirm first, naming who paid", () => {
    const s = { ...calm, confirmFrom: ["Izu"], toAgree: "October", toPay: { to: "Sam", month: "October" } };
    expect(balanceLine(s)).toBe("Confirm payment from Izu");
    expect(balanceLine({ ...s, confirmFrom: ["Izu", "Sam"] })).toBe("Confirm payments from Izu and Sam");
    expect(balanceLine({ ...s, confirmFrom: ["Izu", "Sam", "Rui"] })).toBe("Confirm payments from Izu, Sam and Rui");
    expect(needsAction(s)).toBe(true);
  });

  it("then a declined payment, then agreeing, then recording a payment", () => {
    const all = { ...calm, declined: { by: "Izu", month: "October" }, toAgree: "October", toPay: { to: "Izu", month: "September" } };
    expect(balanceLine(all)).toBe("Izu declined your payment for October");
    expect(balanceLine({ ...all, declined: null })).toBe("October is closed · agree your amount");
    expect(balanceLine({ ...all, declined: null, toAgree: null })).toBe("Record your payment to Izu for September");
  });

  it("shows nothing when there is no open period and nothing waiting", () => {
    expect(balanceLine({ ...calm, closes: null })).toBeNull();
  });
});
