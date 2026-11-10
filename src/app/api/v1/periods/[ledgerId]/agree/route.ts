/**
 * POST /api/v1/periods/{ledgerId}/agree: the caller agrees to their amount for a closed period
 * (SPEC.md rules 21, 22, story US8). Refused while items are left to sort. Returns the stage: when
 * the last member agrees it becomes "agreed" and the amounts are frozen. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { agree } from "@/server/services/periods";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ledgerId: string }> };

export const POST = withUser<Ctx>(async (user, _request, { params }) => {
  const { ledgerId } = await params;
  return agree(user.id, ledgerId);
});
