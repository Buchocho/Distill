/**
 * GET /api/v1/groups/{groupId}/balance: who owes whom in the open period, netted to one line per
 * pair, the caller's own position, and the items left out (SPEC.md rules 15 to 17). Amounts are in
 * cents of the group's currency. Members only. Documented in docs/API.md.
 */

import { withUser } from "@/server/api";
import { getOpenBalance } from "@/server/services/balance";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return getOpenBalance(user.id, groupId);
});
