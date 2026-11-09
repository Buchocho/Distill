/**
 * PATCH /api/v1/items/{itemId}: move a saved item to another category, or to unsorted with null
 * (SPEC.md rules 13 and 14, story US4). Body { categoryId }. Only the category can change after
 * saving, and only while the period is open. Logged and shown on the item. Members only.
 * Documented in docs/API.md.
 */

import { readJson, withUser } from "@/server/api";
import { changeItemCategory } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ itemId: string }> };

export const PATCH = withUser<Ctx>(async (user, request, { params }) => {
  const { itemId } = await params;
  const body = await readJson(request);
  return changeItemCategory(user.id, itemId, typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null);
});
