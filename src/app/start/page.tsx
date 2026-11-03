import Link from "next/link";
import { DistillMark } from "@/components/DistillMark";
import { requireUser } from "@/server/session";

export default async function Start() {
  const user = await requireUser("/start");
  const first = user.name.split(" ")[0];
  return (
    <main className="flex min-h-dvh flex-col bg-ink px-5 pb-10 pt-5 text-paper">
      <DistillMark tone="dark" />
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {first}</h1>
        <p className="text-base text-sand">Distill works in groups: the people you shop with. Start one, or join one you were invited to.</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/groups/new" className="flex min-h-13 items-center justify-center rounded-xl bg-orange text-base font-extrabold text-ink no-underline">
          Create a group
        </Link>
        <div className="rounded-2xl bg-dark-card p-4 text-sm text-sand">
          <p className="font-bold text-paper">Invited by someone?</p>
          <p className="mt-1">Open the invite link they sent you. It brings you straight into their group.</p>
        </div>
      </div>
    </main>
  );
}
