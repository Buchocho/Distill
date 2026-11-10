// Unit tests for membership over time (src/domain/members.ts) and splits by purchase day
// (rules 2d and 2e): joiners do not pay for earlier receipts, leavers keep their earlier share.

import { describe, expect, it } from "vitest";
import { itemDay, membersOn, periodMembers, periodPeople, ruleForDay, withMembership, type Membership } from "@/domain/members";
import { computeBalance } from "@/domain/balance";

const ms: Membership[] = [
  { userId: "ana", joinedOn: "2026-11-01", leftOn: null },
  { userId: "rui", joinedOn: "2026-11-01", leftOn: "2026-11-12" },
  { userId: "sam", joinedOn: "2026-11-10", leftOn: null },
];

describe("membersOn", () => {
  it("counts a joiner from their join day and a leaver until the day before they left", () => {
    expect(membersOn(ms, "2026-11-05")).toEqual(["ana", "rui"]);
    expect(membersOn(ms, "2026-11-10")).toEqual(["ana", "rui", "sam"]);
    expect(membersOn(ms, "2026-11-12")).toEqual(["ana", "sam"]);
  });
});

describe("periodMembers", () => {
  it("includes everyone who was a member on any day of the period", () => {
    expect(periodMembers(ms, "2026-11-01", "2026-11-30")).toEqual(["ana", "rui", "sam"]);
    expect(periodMembers(ms, "2026-12-01", "2026-12-31")).toEqual(["ana", "sam"]);
    expect(periodMembers(ms, "2026-10-01", "2026-10-31")).toEqual([]);
  });
});

describe("itemDay", () => {
  it("uses the printed date, else the saved day, never before the period started", () => {
    expect(itemDay("2026-11-05", "2026-11-07", "2026-11-01")).toBe("2026-11-05");
    expect(itemDay(null, "2026-11-07", "2026-11-01")).toBe("2026-11-07");
    expect(itemDay("2026-10-28", "2026-11-02", "2026-11-01")).toBe("2026-11-01");
  });
});

describe("ruleForDay", () => {
  it("keeps Split equally and Whoever paid", () => {
    expect(ruleForDay({ kind: "everyone", shares: [] }, ["ana"])).toEqual({ kind: "everyone", shares: [] });
    expect(ruleForDay({ kind: "payer", shares: [] }, ["ana"])).toEqual({ kind: "payer", shares: [] });
  });
  it("needs a new rule when a share names someone who was not a member that day", () => {
    const rule = { kind: "shares" as const, shares: [{ userId: "rui", bp: 10000 }] };
    expect(ruleForDay(rule, ["ana", "rui"])).toEqual(rule);
    expect(ruleForDay(rule, ["ana", "sam"])).toBeNull();
  });
});

describe("splitting by purchase day", () => {
  it("does not charge a joiner for items bought before they joined", () => {
    const items = [
      // 9,00 bought by Ana on 5 Nov: Ana and Rui only.
      { priceCents: 900, payerId: "ana", categoryId: "c", rule: { kind: "everyone" as const, shares: [] }, sharers: membersOn(ms, "2026-11-05") },
      // 9,00 bought by Ana on 10 Nov: Ana, Rui and Sam.
      { priceCents: 900, payerId: "ana", categoryId: "c", rule: { kind: "everyone" as const, shares: [] }, sharers: membersOn(ms, "2026-11-10") },
    ];
    const { lines } = computeBalance(items, ["ana", "rui", "sam"]);
    expect(lines).toEqual([
      { from: "rui", to: "ana", cents: 750 },
      { from: "sam", to: "ana", cents: 300 },
    ]);
  });
});

describe("withMembership", () => {
  it("adds who shares each item and drops a rule that names someone gone that day", () => {
    const onlyRui = { kind: "shares" as const, shares: [{ userId: "rui", bp: 10000 }] };
    const items = [
      { categoryId: "c", purchaseDate: "2026-11-05", savedAt: null },
      { categoryId: "c", purchaseDate: "2026-11-13", savedAt: null },
      { categoryId: null, purchaseDate: null, savedAt: new Date("2026-11-14T10:00:00Z") },
    ];
    const out = withMembership(items, ms, "2026-11-01", (c) => (c ? onlyRui : null));
    expect(out[0].sharers).toEqual(["ana", "rui"]);
    expect(out[0].rule).toEqual(onlyRui);
    expect(out[1].sharers).toEqual(["ana", "sam"]);
    expect(out[1].rule).toBeNull();
    expect(out[2].sharers).toEqual(["ana", "sam"]);
  });
});

describe("periodPeople", () => {
  it("drops someone removed with nothing in the period, keeps a leaver who shares an item", () => {
    const withWrong: Membership[] = [...ms, { userId: "wrong", joinedOn: "2026-11-10", leftOn: "2026-11-10" }];
    const items = [{ payerId: "ana", sharers: ["ana", "rui"] }];
    expect(periodPeople(withWrong, "2026-11-01", "2026-11-30", items)).toEqual(["ana", "rui", "sam"]);
    // Rui left and shares nothing: he drops out too.
    expect(periodPeople(ms, "2026-11-01", "2026-11-30", [{ payerId: "ana", sharers: ["ana"] }])).toEqual(["ana", "sam"]);
  });
});
