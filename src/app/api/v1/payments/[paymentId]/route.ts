/**
 * DELETE /api/v1/payments/{paymentId}: removes a payment still waiting for confirmation. The
 * recorder cancels it, or the other person declines it (SPEC.md rule 25, story US9). Confirmed
 * payments cannot be removed. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { removePayment } from "@/server/services/payments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ paymentId: string }> };

export const DELETE = withUser<Ctx>(async (user, _request, { params }) => {
  const { paymentId } = await params;
  return removePayment(user.id, paymentId);
});
