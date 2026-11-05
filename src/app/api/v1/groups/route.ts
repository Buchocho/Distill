/**
 * /api/v1/groups: list and create groups (story US1). Documented in docs/API.md.
 * The same rules as the New group screen apply, because both call createGroup.
 */

import { readJson, withUser } from "@/server/api";
import { createGroup, listMyGroups } from "@/server/services/groups";
import type { CloseRule } from "@/domain/ledgers";

export const dynamic = "force-dynamic";

/** GET: the signed in user's groups. */
export const GET = withUser(async (user) => ({ groups: await listMyGroups(user.id) }));

/**
 * POST: create a group from a JSON body { name, closeRule, closeDay }. Fields of the wrong type are
 * treated as empty, so the caller gets the normal validation messages rather than a crash.
 */
export const POST = withUser(async (user, request) => {
  const body = await readJson(request);
  const group = await createGroup(user.id, {
    name: typeof body.name === "string" ? body.name : "",
    close: {
      rule: (typeof body.closeRule === "string" ? body.closeRule : "") as CloseRule,
      day: typeof body.closeDay === "number" ? body.closeDay : null,
    },
  });
  return { group };
});
