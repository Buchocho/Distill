/**
 * /api/v1/items/{itemId}: one saved item. Members only. Documented in docs/API.md.
 * PATCH: move it to another category, or to unsorted with null (SPEC.md rules 13 and 14, story
 * US4). Body { categoryId }. In the open period any item; in a closed period not yet agreed, only
 * an item with no category (rule 20). Logged and shown on the item.
 * DELETE: remove a leftover item with no category from a closed period; only its payer (rule 20).
 */

import { readJson, withUser } from "@/server/api";
import { changeItemCategory, deleteItem } from "@/server/services/categories";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ itemId: string }> };

export const PATCH = withUser<Ctx>(async (user, request, { params }) => {
  const { itemId } = await params;
  const body = await readJson(request);
  return changeItemCategory(user.id, itemId, typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null);
});

export const DELETE = withUser<Ctx>(async (user, _request, { params }) => {
  const { itemId } = await params;
  return deleteItem(user.id, itemId);
});

