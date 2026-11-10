/**
 * GET /api/v1/groups/{groupId}/payments: every payment in the group, newest first, and confirmed
 * totals per pair for this year (story US9, SPEC.md rule 26). Members only. Documented in
 * docs/API.md. Payments are recorded per period: POST /api/v1/periods/{ledgerId}/payments.
 */

import { withUser } from "@/server/api";
import { listPayments } from "@/server/services/payments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return listPayments(user.id, groupId);
});
