/**
 * /api/v1/groups/{groupId}: one group. Members only; anyone else gets 404 (architecture rule 4).
 * Documented in docs/API.md.
 * GET: the group with its members and open period. Closes the open period first if it has ended.
 * PATCH: change when accounts close. Body { closeRule, closeDay } as for creating a group. Applies
 * now: the open period ends on the new rule's first close date from today; returns `endsOn`
 * (SPEC.md rule 18).
 */

import { readJson, withUser } from "@/server/api";
import { getGroupForMember } from "@/server/services/groups";
import { setCloseRule } from "@/server/services/periods";
import type { CloseRule } from "@/domain/ledgers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return getGroupForMember(user.id, groupId);
});

export const PATCH = withUser<Ctx>(async (user, request, { params }) => {
  const { groupId } = await params;
  const body = await readJson(request);
  return setCloseRule(user.id, groupId, {
    rule: String(body.closeRule ?? "") as CloseRule,
    day: typeof body.closeDay === "number" ? body.closeDay : null,
  });
});
