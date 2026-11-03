import { withUser } from "@/server/api";
import { listMyGroups } from "@/server/services/groups";

export const dynamic = "force-dynamic";

export const GET = withUser(async (user) => ({ user, groups: await listMyGroups(user.id) }));
