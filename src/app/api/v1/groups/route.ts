/**
 * /api/v1/groups: list and create groups (story US1). Documented in docs/API.md.
 * The same rules as the New group screen apply, because both call createGroup.
 */

import { readJson, withUser } from "@/server/api";
import { createGroup, listMyGroups } from "@/server/services/groups";
import type { CloseRule } from "@/domain/ledgers";
import { DEFAULT_CURRENCY } from "@/domain/currencies";
import { isValidLocalDate, utcToday } from "@/domain/groups";
import { ServiceError } from "@/server/services/errors";

export const dynamic = "force-dynamic";

/** GET: the signed in user's groups. */
export const GET = withUser(async (user) => ({ groups: await listMyGroups(user.id) }));

/**
 * POST: create a group from a JSON body { name, closeRule, closeDay, currency, localDate }. Fields of the
 * wrong type are treated as empty, so the caller gets the normal validation messages rather than a crash.
 * currency defaults to EUR when left out (rule 2b). localDate is the caller's own date as YYYY-MM-DD;
 * when it is left out the UTC date is used, and an impossible date is refused (rule 2c).
 */
export const POST = withUser(async (user, request) => {
  const body = await readJson(request);
  const localToday = body.localDate === undefined ? utcToday() : String(body.localDate);
  if (!isValidLocalDate(localToday)) {
    throw new ServiceError("invalid", "Check the form.", { localDate: "Send today's date as YYYY-MM-DD." });
  }
  const group = await createGroup(user.id, {
    name: typeof body.name === "string" ? body.name : "",
    close: {
      rule: (typeof body.closeRule === "string" ? body.closeRule : "") as CloseRule,
      day: typeof body.closeDay === "number" ? body.closeDay : null,
    },
    currency: body.currency === undefined ? DEFAULT_CURRENCY : typeof body.currency === "string" ? body.currency : "",
  }, localToday);
  return { group };
});
