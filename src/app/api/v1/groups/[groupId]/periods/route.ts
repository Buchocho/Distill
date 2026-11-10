/**
 * GET /api/v1/groups/{groupId}/periods: the group's closed periods not yet settled, newest first,
 * with their stage (closed or agreed), whether the caller agreed, and how many members have
 * (stories US7, US8). Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { listClosedPeriods } from "@/server/services/periods";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return { periods: await listClosedPeriods(user.id, groupId) };
});
