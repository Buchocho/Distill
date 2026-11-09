/**
 * /api/v1/receipts/{receiptId}: one receipt. Members only. Documented in docs/API.md.
 * GET: the receipt with its items, the group's categories and members, the group currency and
 * its number of photos (screen 3).
 * DELETE: delete it with its photos, only while it is not saved (SPEC.md rule 9b).
 */

import { withUser } from "@/server/api";
import { deleteReceipt, getReceipt } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ receiptId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { receiptId } = await params;
  return getReceipt(user.id, receiptId);
});

export const DELETE = withUser<Ctx>(async (user, _request, { params }) => {
  const { receiptId } = await params;
  await deleteReceipt(user.id, receiptId);
});

