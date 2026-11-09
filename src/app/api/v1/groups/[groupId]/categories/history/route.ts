/**
 * GET /api/v1/groups/{groupId}/categories/history: who created categories and changed rules, and
 * when, newest first (SPEC.md rule 14a). Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { categoryHistory } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return { history: await categoryHistory(user.id, groupId) };
});
