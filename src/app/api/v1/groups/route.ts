import { readJson, withUser } from "@/server/api";
import { createGroup, listMyGroups } from "@/server/services/groups";
import type { CloseRule } from "@/domain/ledgers";

export const dynamic = "force-dynamic";

export const GET = withUser(async (user) => ({ groups: await listMyGroups(user.id) }));

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
