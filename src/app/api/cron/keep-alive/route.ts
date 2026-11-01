import { keepAlive } from "@/server/services/system";

export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await keepAlive();
    console.log("keep-alive ok", result);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("keep-alive failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
