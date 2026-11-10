/**
 * POST /api/v1/payments/{paymentId}/confirm: the person who did not record a payment confirms it
 * (SPEC.md rule 25, story US9). A confirmed payment cannot change. When it completes what was owed,
 * the period becomes settled. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { confirmPayment } from "@/server/services/payments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ paymentId: string }> };

export const POST = withUser<Ctx>(async (user, _request, { params }) => {
  const { paymentId } = await params;
  return confirmPayment(user.id, paymentId);
});
