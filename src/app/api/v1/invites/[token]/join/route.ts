import { withUser } from "@/server/api";
import { joinByToken } from "@/server/services/groups";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export const POST = withUser<Ctx>(async (user, _request, { params }) => ({
  group: await joinByToken(user.id, (await params).token),
}));
