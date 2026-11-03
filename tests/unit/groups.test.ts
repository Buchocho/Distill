import { describe, expect, it } from "vitest";
import { validateNewGroup } from "@/domain/groups";

describe("validateNewGroup", () => {
  it("accepts a valid group", () => {
    expect(validateNewGroup({ name: "Rua das Flores 12", close: { rule: "month_end", day: null } })).toEqual({});
  });
  it("requires a name and a valid close setting", () => {
    const e = validateNewGroup({ name: "   ", close: { rule: "month_day", day: 40 } });
    expect(e.name).toBeDefined();
    expect(e.close).toBeDefined();
  });
  it("limits the name length", () => {
    expect(validateNewGroup({ name: "x".repeat(61), close: { rule: "month_end", day: null } }).name).toBeDefined();
  });
});
