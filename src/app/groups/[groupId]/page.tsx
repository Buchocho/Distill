import Link from "next/link";
import { DistillMark } from "@/components/DistillMark";
import { CartFigure, ScaleFigure, TagFigure } from "@/components/Figures";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { daysUntil } from "@/domain/ledgers";

export const dynamic = "force-dynamic";

// Home: three sections, dark to light, each leading to its tab. No amounts are shown here.
export default async function Home({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}`);
  const { group, openLedger } = await groupOr404(user.id, groupId);
  const first = user.name.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = openLedger ? daysUntil(today, openLedger.endsOn) : null;
  const month = openLedger ? new Date(`${openLedger.endsOn}T00:00:00Z`).toLocaleString("en-GB", { month: "long", timeZone: "UTC" }) : "";
  const pill = "mt-1.5 inline-flex h-10 items-center gap-2 self-start rounded-full px-4 text-sm font-extrabold";
  const section = "relative flex min-h-[230px] flex-1 overflow-hidden rounded-t-[28px] pb-11 pl-5 pr-4 pt-5 no-underline";

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="flex items-center gap-3 px-5 pb-2 pt-5">
        <div className="flex flex-1 flex-col gap-0.5">
          <DistillMark tone="dark" />
          <span className="text-[13px] text-sand">{group.name}{month ? ` · ${month}` : ""}</span>
        </div>
        <Link href={`/groups/${groupId}/invite`} aria-label="Group members and invite link"
          className="grid size-10 place-items-center rounded-full bg-paper text-[15px] font-extrabold text-ink no-underline">
          {first[0]}
        </Link>
      </header>
      <h1 className="mx-5 mb-4 mt-1 text-[26px] font-extrabold tracking-tight">Hello, {first}</h1>

      <Link href={`/groups/${groupId}/receipts`} className={`${section} bg-dark text-paper`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px] text-sand">RECEIPTS</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">Bought something?<br />Scan it.</span>
          <span className="text-[13px] text-sand">No receipts yet</span>
          <span className={`${pill} bg-orange text-ink`}><Icon name="camera" size={18} strokeWidth={2.2} />Scan receipt</span>
        </div>
        <CartFigure />
      </Link>

      <Link href={`/groups/${groupId}/categories`} className={`${section} -mt-7 bg-orange text-ink shadow-[0_-10px_30px_rgba(0,0,0,0.25)]`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px]">CATEGORIES</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">Who shares<br />what</span>
          <span className="text-[13px] font-semibold">Categories appear as receipts come in</span>
          <span className={`${pill} bg-ink text-paper`}>See categories<Icon name="arrow" size={16} strokeWidth={2.5} /></span>
        </div>
        <TagFigure />
      </Link>

      <Link href={`/groups/${groupId}/balance`} className={`${section} -mt-7 bg-white pb-7 text-ink shadow-[0_-10px_30px_rgba(0,0,0,0.18)]`}>
        <div className="z-10 flex flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[1.4px] text-grey-600">BALANCE</span>
          <span className="text-2xl font-extrabold leading-tight tracking-tight">The group&apos;s<br />balance</span>
          {daysLeft !== null && (
            <span className="text-[13px] text-grey-600">{month} closes {daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}</span>
          )}
          <span className={`${pill} bg-ink text-paper`}>
            <span aria-hidden="true" className="grid size-[22px] rotate-[14deg] place-items-center rounded-full bg-orange text-sm font-extrabold text-ink">€</span>
            Check balance
          </span>
        </div>
        <ScaleFigure />
      </Link>
    </main>
  );
}
