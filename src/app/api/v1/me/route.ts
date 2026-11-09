/**
 * /api/v1/me: the signed in user. Documented in docs/API.md.
 * GET: the user (with the name they are shown as) and the groups they belong to.
 * PATCH: change the name they are shown as in every group. Body { displayName } (SPEC.md rule 1).
 */

import { readJson, withUser } from "@/server/api";
import { listMyGroups } from "@/server/services/groups";
import { setDisplayName } from "@/server/services/users";

export const dynamic = "force-dynamic";

export const GET = withUser(async (user) => ({ user, groups: await listMyGroups(user.id) }));

export const PATCH = withUser(async (user, request) => {
  const body = await readJson(request);
  return setDisplayName(user.id, typeof body.displayName === "string" ? body.displayName : "");
});
