/**
 * GET /api/v1/receipts/{receiptId}: a receipt with its items, the group's categories and members,
 * the group currency and links to view its photos (screen 3). Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { getReceipt } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ receiptId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { receiptId } = await params;
  return getReceipt(user.id, receiptId);
});
