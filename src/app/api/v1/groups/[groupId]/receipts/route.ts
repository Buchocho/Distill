/**
 * /api/v1/groups/{groupId}/receipts: list a group's receipts and start a new one (story US2).
 * Members only. Documented in docs/API.md. The Receipts screen uses these same routes.
 */

import { withUser } from "@/server/api";
import { listReceipts, startReceipt } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

/** GET: the group's receipts, newest first, with status and unsorted item count. */
export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return { receipts: await listReceipts(user.id, groupId) };
});

/**
 * POST: start a receipt, paid by the caller (SPEC.md rule 4: a member adds only their own receipts).
 * Returns the receipt id and a one time upload link { path, token } for the photo. After uploading,
 * call POST /api/v1/receipts/{id}/read.
 */
export const POST = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return startReceipt(user.id, groupId);
});
