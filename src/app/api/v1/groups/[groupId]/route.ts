/**
 * GET /api/v1/groups/{groupId}: one group with its members and open period. Members only; anyone
 * else gets 404 (architecture rule 4). Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { getGroupForMember } from "@/server/services/groups";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return getGroupForMember(user.id, groupId);
});
