/**
 * /api/v1/groups/{groupId}/categories: the group's categories (story US3). Members only.
 * GET: every category with its rule in words and its item count in the open period, plus how many
 * items need sorting (SPEC.md rules 12 and 17).
 * POST: add a category. Body { name }. It starts with no rule (rule 14a).
 * Documented in docs/API.md.
 */

import { readJson, withUser } from "@/server/api";
import { createCategory, listCategories } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return listCategories(user.id, groupId);
});

export const POST = withUser<Ctx>(async (user, request, { params }) => {
  const { groupId } = await params;
  const body = await readJson(request);
  return createCategory(user.id, groupId, typeof body.name === "string" ? body.name : "");
});
