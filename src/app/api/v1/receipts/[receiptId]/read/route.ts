/**
 * POST /api/v1/receipts/{receiptId}/read: read the receipt's photo with Gemini (SPEC.md rules 6, 7)
 * and return { status: "ready" } or { status: "failed" }. Calling it again is Retry (rule 10).
 * Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { readReceipt } from "@/server/services/receipts";

export const dynamic = "force-dynamic";
// Reading a photo can take 10 to 30 seconds; allow up to a minute before Vercel stops the request.
export const maxDuration = 60;

type Ctx = { params: Promise<{ receiptId: string }> };

export const POST = withUser<Ctx>(async (user, _request, { params }) => {
  const { receiptId } = await params;
  return readReceipt(user.id, receiptId);
});
