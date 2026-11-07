/**
 * /api/v1/groups/{groupId}/receipts: list a group's receipts and start a new one (story US2).
 * Members only. Documented in docs/API.md. The Receipts screen uses these same routes.
 */

import { readJson, withUser } from "@/server/api";
import { listReceipts, startReceipt } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

/** GET: the group's receipts, newest first, with status and unsorted item count. */
export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return { receipts: await listReceipts(user.id, groupId) };
});

/**
 * POST: start a receipt. Body { paidBy } (a member's user id; defaults to the caller, SPEC.md rule 4).
 * Returns the receipt id and a one time upload link { path, token } for the photo. After uploading,
 * call POST /api/v1/receipts/{id}/read.
 */
export const POST = withUser<Ctx>(async (user, request, { params }) => {
  const { groupId } = await params;
  const body = await readJson(request);
  const paidBy = typeof body.paidBy === "string" && body.paidBy ? body.paidBy : user.id;
  return startReceipt(user.id, groupId, paidBy);
});
