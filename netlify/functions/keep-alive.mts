// Netlify Scheduled Function: once a day, call the app's keep alive endpoint
// so the free Supabase project is not paused. The work itself is done by
// src/app/api/cron/keep-alive, which checks CRON_SECRET.

export default async function keepAlive(): Promise<Response> {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("keep-alive: URL or CRON_SECRET is not set");
    return new Response("missing configuration", { status: 500 });
  }
  const res = await fetch(`${base}/api/cron/keep-alive`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`keep-alive: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
}

export const config = { schedule: "17 6 * * *" };
