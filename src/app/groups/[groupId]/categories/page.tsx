/**
 * Screen 4, Categories tab. Route: /groups/<id>/categories. Story US3.
 * Every category with its sharing rule in words, categories without a rule first; one "needs
 * sorting" flag when at least one item is unsorted or in a category without a rule (SPEC.md rules
 * 12 and 17; one flag rather than one per item, decided 9 Nov 2026); History; Add category, above
 * the list so it is always in reach.
 * Orange, like the rest of the Categories journey (approved design, CategoriesOrange).
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { TabScreen } from "@/components/TabScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { listCategories } from "@/server/services/categories";
import { AddCategory } from "./AddCategory";

export const dynamic = "force-dynamic";

export default async function Categories({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/categories`);
  const { me } = await groupOr404(user.id, groupId);
  const { categories, needsSorting } = await listCategories(user.id, groupId);

  // The return draws the needs sorting flag, then Add category, then the categories. Add category
  // sits above the list so it stays in reach however many categories there are (10 Nov 2026).
  return (
    <TabScreen groupId={groupId} tab="categories" label="CATEGORIES" title="Who shares what"
      action={
        <Link href={`/groups/${groupId}/categories/history`}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-bold text-paper no-underline">
          <Icon name="clock" size={16} strokeWidth={2.2} />History
        </Link>
      }>
      {needsSorting > 0 && (
        <Link href={`/groups/${groupId}/categories/sort`}
          className="flex min-h-16 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper no-underline">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-extrabold">{needsSorting} item{needsSorting === 1 ? " needs" : "s need"} sorting</span>
            <span className="text-[13px] text-sand">They stay out of the balance until then</span>
          </div>
          <span className="text-orange"><Icon name="arrow" size={20} strokeWidth={2.5} /></span>
        </Link>
      )}

      {me.leftOn === null && <AddCategory groupId={groupId} />}

      {categories.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-center text-ink">
          <p className="font-bold">No categories yet</p>
          <p className="mt-1 text-sm text-grey-600">They are created when receipts are saved, or add one below.</p>
        </div>
      ) : (
        <ul className="rounded-2xl bg-white px-4 text-ink">
          {categories.map((c) => (
            <li key={c.id} className="border-b border-grey-100 last:border-0">
              <Link href={`/groups/${groupId}/categories/${c.id}`} className="flex min-h-[54px] items-center gap-3 text-ink no-underline">
                <span className="flex-1 font-bold">{c.name}</span>
                <span className={`text-right text-sm ${c.hasRule ? "text-grey-600" : "font-bold text-orange-text"}`}>{c.ruleText}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TabScreen>
  );
}
