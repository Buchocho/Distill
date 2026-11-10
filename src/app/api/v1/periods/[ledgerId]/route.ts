/**
 * GET /api/v1/periods/{ledgerId}: one period for the Close the period screen: stage, balance lines,
 * the caller's amount, leftover items, categories without a rule, who agreed, and why Agree is
 * closed if it is (SPEC.md rules 20 to 22). Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { getPeriod } from "@/server/services/periods";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ledgerId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { ledgerId } = await params;
  return getPeriod(user.id, ledgerId);
});
