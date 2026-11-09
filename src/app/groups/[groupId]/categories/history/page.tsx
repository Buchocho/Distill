/**
 * Screen 4c, Category history. Route: /groups/<id>/categories/history. Story US3.
 * Every category creation and rule change in the group, newest first, with who made it and when,
 * so every member can see who changed what (SPEC.md rule 14a). Orange (approved design, History2).
 */

import { SubScreen } from "@/components/SubScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { categoryHistory } from "@/server/services/categories";
import { longDate } from "@/domain/dates";

export const dynamic = "force-dynamic";

export default async function History({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/categories/history`);
  await groupOr404(user.id, groupId);
  const history = await categoryHistory(user.id, groupId);

  // The return draws the list of changes, or an empty state.
  return (
    <SubScreen groupId={groupId} tab="categories" backHref={`/groups/${groupId}/categories`} backLabel="Back to categories" title="History">
      {history.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-center text-ink"><p className="font-bold">No changes yet</p></div>
      ) : (
        <ul className="rounded-2xl bg-white px-4 text-ink">
          {history.map((h) => (
            <li key={h.id} className="flex flex-col gap-0.5 border-b border-grey-100 py-3 last:border-0">
              <span className="font-bold">{h.category}</span>
              <span className="text-sm">{h.summary}</span>
              <span className="text-[13px] text-grey-600">{h.by.split(" ")[0]} · {longDate(h.at.toISOString().slice(0, 10))}</span>
            </li>
          ))}
        </ul>
      )}
    </SubScreen>
  );
}
