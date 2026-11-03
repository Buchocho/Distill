import Link from "next/link";
import { notFound } from "next/navigation";
import { DistillMark } from "@/components/DistillMark";
import { requireUser } from "@/server/session";
import { getInvite } from "@/server/services/groups";
import { ServiceError } from "@/server/services/errors";
import { describeClose } from "@/domain/ledgers";
import { joinGroupAction } from "@/app/actions";

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser(`/join/${token}`);
  let invite;
  try {
    invite = await getInvite(token);
  } catch (e) {
    if (e instanceof ServiceError) notFound();
    throw e;
  }
  const { group, members } = invite;
  if (members.some((m) => m.id === user.id)) {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-4 bg-paper px-5">
        <h1 className="text-2xl font-extrabold">You are already in {group.name}</h1>
        <Link href={`/groups/${group.id}`} className="flex min-h-13 items-center justify-center rounded-xl bg-orange font-extrabold text-ink no-underline">Go to Home</Link>
      </main>
    );
  }
  const inviter = members[0]?.name.split(" ")[0] ?? "Someone";
  const names = members.map((m) => m.name.split(" ")[0]);
  const join = joinGroupAction.bind(null, token);
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-5 pb-8 pt-4 text-ink">
      <DistillMark tone="paper" />
      <div className="flex flex-1 flex-col justify-center gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[15px] text-grey-700">{inviter} invited you to join</span>
          <h1 className="text-3xl font-extrabold leading-tight">{group.name}</h1>
        </div>
        <div className="rounded-2xl bg-white px-4 py-1">
          <div className="flex min-h-14 items-center gap-3 border-b border-grey-200">
            <div className="flex">
              {names.slice(0, 4).map((n, i) => (
                <span key={i} className={`grid size-8 place-items-center rounded-full border-2 border-white bg-ink text-[13px] font-bold text-paper ${i ? "-ml-2" : ""}`}>{n[0]}</span>
              ))}
            </div>
            <span className="flex-1 text-[15px]">{names.join(", ")} {names.length === 1 ? "is" : "are"} in this group</span>
          </div>
          <div className="flex min-h-14 items-center text-[15px]">{describeClose({ rule: group.closeRule, day: group.closeDay })}</div>
        </div>
        <p className="text-sm text-grey-700">Once you join, you will see the group&apos;s receipts and categories, and your share of shared items.</p>
      </div>
      <form action={join} className="flex flex-col gap-2">
        <button type="submit" className="min-h-13 rounded-xl bg-orange text-base font-extrabold text-ink">Join group</button>
        <Link href="/" className="flex min-h-11 items-center justify-center text-[15px] font-semibold text-orange-text">Not now</Link>
      </form>
    </main>
  );
}
