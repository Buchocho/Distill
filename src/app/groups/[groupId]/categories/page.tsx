/**
 * Screen 4, Categories tab. Route: /groups/<id>/categories. Story US3.
 * PLACEHOLDER: shows the tab and an empty state only. Categories, sharing rules and the change
 * history are built in step 3 (SPEC.md section 6).
 */

import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";

export default async function Categories({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/categories`);
  await groupOr404(user.id, groupId);
  return (
    <TabScreen groupId={groupId} tab="categories" label="CATEGORIES" title="Who shares what">
      <div className="rounded-2xl bg-white p-5 text-center text-ink">
        <p className="font-bold">No categories yet</p>
        <p className="mt-1 text-sm text-grey-600">Categories are created as receipts are read. Each one gets a rule for who shares it.</p>
      </div>
    </TabScreen>
  );
}
