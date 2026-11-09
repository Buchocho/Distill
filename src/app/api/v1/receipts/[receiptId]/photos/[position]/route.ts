/**
 * GET /api/v1/receipts/{receiptId}/photos/{position}: opens one photo of a receipt (1 is the first).
 * Members only. Sends the browser to a fresh 10 minute link made at this moment, so "See photo"
 * never shows an expired link, however long the page has been open. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { photoLink } from "@/server/services/receipts";
import { ServiceError } from "@/server/services/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ receiptId: string; position: string }> };

/** Sends a redirect to the photo. Errors keep the API's usual JSON format (see withUser). */
export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { receiptId, position } = await params;
  const n = Number(position);
  if (!Number.isInteger(n) || n < 1) throw new ServiceError("not_found", "Photo not found.");
  return Response.redirect(await photoLink(user.id, receiptId, n), 302);
});
