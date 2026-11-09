/** Tests for src/domain/users.ts (SPEC.md rule 1). */
import { describe, expect, it } from "vitest";
import { checkDisplayName } from "@/domain/users";

describe("checkDisplayName", () => {
  it("accepts a short name and tidies spaces", () => {
    expect(checkDisplayName("  Butch ")).toEqual({ name: "Butch" });
    expect(checkDisplayName("Ana   Rita")).toEqual({ name: "Ana Rita" });
  });
  it("refuses empty and over long names", () => {
    expect(checkDisplayName("   ")).toHaveProperty("error");
    expect(checkDisplayName("x".repeat(31))).toHaveProperty("error");
  });
});
