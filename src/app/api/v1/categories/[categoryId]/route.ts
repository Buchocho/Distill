/**
 * GET /api/v1/categories/{categoryId}: one category with its rule, the group's members and the
 * latest change (screen 4b). Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { getCategory } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ categoryId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { categoryId } = await params;
  return getCategory(user.id, categoryId);
});
