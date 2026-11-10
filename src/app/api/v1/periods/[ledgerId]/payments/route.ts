/**
 * /api/v1/periods/{ledgerId}/payments: a period's payments, and recording one (story US9,
 * SPEC.md rules 24 to 26). Only the person who paid records a payment; it waits for the person
 * paid to confirm. Members only. Documented in docs/API.md. The period screen uses the same services.
 */

import { readJson, withUser } from "@/server/api";
import { periodPayments, recordPayment } from "@/server/services/payments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ledgerId: string }> };

/** GET: per amount owed, what is confirmed, waiting and left, and the payments still waiting. */
export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { ledgerId } = await params;
  return periodPayments(user.id, ledgerId);
});

/**
 * POST: record a payment the caller made in this period. Body: { toUser, amountCents, paidOn }.
 * The period must be agreed; the amount at most what is left after payments still waiting.
 */
export const POST = withUser<Ctx>(async (user, request, { params }) => {
  const { ledgerId } = await params;
  const body = await readJson(request);
  return recordPayment(user.id, {
    ledgerId,
    toUser: typeof body.toUser === "string" ? body.toUser : "",
    amountCents: typeof body.amountCents === "number" ? body.amountCents : NaN,
    paidOn: typeof body.paidOn === "string" ? body.paidOn : "",
  });
});
