/**
 * GET /api/v1/groups/{groupId}/to-sort: what is left out of the open period's balance: items with
 * no category, and categories with items but no rule (SPEC.md rules 12 and 17). Members only.
 * Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { listToSort } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return listToSort(user.id, groupId);
});
