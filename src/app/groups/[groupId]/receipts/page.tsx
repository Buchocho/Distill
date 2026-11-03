import Link from "next/link";
import { Icon } from "@/components/Icon";
import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";

export default async function Receipts({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/receipts`);
  const { group } = await groupOr404(user.id, groupId);
  return (
    <TabScreen groupId={groupId} tab="receipts" label="RECEIPTS" title={group.name}
      action={<Link href={`/groups/${groupId}/invite`} className="mt-1 min-h-11 rounded-full px-3 py-2.5 text-sm font-bold text-orange">Invite</Link>}>
      <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[20px] bg-orange text-lg font-extrabold text-ink opacity-60">
        <Icon name="camera" size={34} />
        Take a photo
      </div>
      <div className="rounded-2xl bg-dark-card p-5 text-center">
        <p className="font-bold">No receipts yet</p>
        <p className="mt-1 text-sm text-sand">Scanning arrives in the next build. Your receipts will be listed here.</p>
      </div>
    </TabScreen>
  );
}
