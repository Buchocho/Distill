import { withUser } from "@/server/api";
import { getGroupForMember } from "@/server/services/groups";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ groupId: string }> };

export const GET = withUser<Ctx>(async (user, _request, { params }) => {
  const { groupId } = await params;
  return getGroupForMember(user.id, groupId);
});
