import { databaseIsUp } from "@/server/services/system";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = await databaseIsUp();
  return Response.json(
    { status: database ? "ok" : "degraded", database },
    { status: database ? 200 : 503 },
  );
}
