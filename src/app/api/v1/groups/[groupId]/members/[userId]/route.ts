/**
 * DELETE /api/v1/groups/{groupId}/members/{userId}: take someone out of a group from today
 * (SPEC.md rule 2e, decided 10 Nov 2026). Your own id leaves the group; another member's id removes
 * them. Any current member can do either; there is no admin (rule 3). Nothing is deleted: they
 * keep their share of what was bought before, and still agree and settle. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { removeMember } from "@/server/services/groups";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string; userId: string }> };

export const DELETE = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId, userId } = await params;
  return removeMember(user.id, groupId, userId);
});
