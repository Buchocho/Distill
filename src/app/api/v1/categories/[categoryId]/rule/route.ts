/**
 * PUT /api/v1/categories/{categoryId}/rule: set a category's sharing rule (SPEC.md rule 11, story
 * US3). Body { kind: "everyone" | "payer" | "shares", shares: [{ userId, bp }] }, where bp is basis
 * points (10000 = 100%) and shares is used only for "shares". Any member can set it; the change is
 * logged (rule 14a) and applies to every item in the open period (rule 13a). Documented in docs/API.md.
 */

import { readJson, withUser } from "@/server/api";
import { setRule } from "@/server/services/categories";
import type { RuleKind } from "@/domain/rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ categoryId: string }> };

export const PUT = withUser<Ctx>(async (user, request, { params }) => {
  const { categoryId } = await params;
  const body = await readJson(request);
  const list = Array.isArray(body.shares) ? body.shares : [];
  // Wrong types become values the rule check refuses, so the caller gets the normal message.
  const shares = list.map((raw) => {
    const s = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    return { userId: typeof s.userId === "string" ? s.userId : "", bp: typeof s.bp === "number" ? s.bp : Number.NaN };
  });
  return setRule(user.id, categoryId, { kind: String(body.kind ?? "") as RuleKind, shares });
});
