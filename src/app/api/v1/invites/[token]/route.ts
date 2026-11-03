import { withUser } from "@/server/api";
import { getInvite } from "@/server/services/groups";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export const GET = withUser<Ctx>(async (_user, _request, { params }) => getInvite((await params).token));
