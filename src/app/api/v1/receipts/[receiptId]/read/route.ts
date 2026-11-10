/**
 * POST /api/v1/receipts/{receiptId}/read: read the receipt's photo with Gemini (SPEC.md rules 6, 7)
 * and return { status: "ready" } or { status: "failed" } ({ reason: "busy" } when Gemini's quota is
 * reached). Calling it again is Retry (rule 10). Refused with 429 over the limits of rule 10a:
 * 20 readings a day per person, one at a time.
 * Optional body { localDate: "YYYY-MM-DD" }, the caller's own date (rule 2c), used to read dates
 * printed in an unusual order; the UTC date is used without it.
 * Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { readReceipt } from "@/server/services/receipts";
import { isValidLocalDate, utcToday } from "@/domain/groups";

export const dynamic = "force-dynamic";
// Reading a photo can take 10 to 30 seconds; allow up to a minute before Vercel stops the request.
export const maxDuration = 60;

type Ctx = { params: Promise<{ receiptId: string }> };

export const POST = withUser<Ctx>(async (user, request, { params }) => {
  const { receiptId } = await params;
  // The body is optional: an empty or unreadable one just means "no date sent".
  const body = (await request.json().catch(() => ({}))) as { localDate?: unknown };
  const sent = typeof body.localDate === "string" ? body.localDate : "";
  return readReceipt(user.id, receiptId, isValidLocalDate(sent) ? sent : utcToday());
});
