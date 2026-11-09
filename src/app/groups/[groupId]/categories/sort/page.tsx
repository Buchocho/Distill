/**
 * Needs sorting. Route: /groups/<id>/categories/sort. Stories US3 and US4.
 * Everything left out of the open period's balance (SPEC.md rules 12 and 17): items with no
 * category, each with a dropdown to give it one (rule 13), and categories that have items but no
 * rule, each linking to its rule screen. Opened from the single "needs sorting" flag on Categories
 * and from Balance. Orange, like the Categories journey.
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ItemCategoryPicker } from "@/components/ItemCategoryPicker";
import { SubScreen } from "@/components/SubScreen";
import { requireUser } from "@/server/session";
import { groupOr404 } from "@/server/pageData";
import { listToSort } from "@/server/services/categories";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function Sort({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser(`/groups/${groupId}/categories/sort`);
  const { group } = await groupOr404(user.id, groupId);
  const { unsorted, noRule, categories } = await listToSort(user.id, groupId);

  // The return draws categories needing a rule, then unsorted items, or "all sorted".
  return (
    <SubScreen groupId={groupId} tab="categories" backHref={`/groups/${groupId}/categories`} backLabel="Back to categories" title="Needs sorting">
      {unsorted.length === 0 && noRule.length === 0 && (
        <div className="rounded-2xl bg-white p-5 text-center text-ink">
          <p className="font-bold">All sorted</p>
          <p className="mt-1 text-sm text-grey-600">Every item in this period is in the balance.</p>
        </div>
      )}

      {noRule.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="mx-1 text-xs font-bold tracking-[1.4px]">CATEGORIES WITHOUT A RULE</h2>
          <ul className="flex flex-col gap-2">
            {noRule.map((c) => (
              <li key={c.id}>
                <Link href={`/groups/${groupId}/categories/${c.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-ink px-4 text-paper no-underline">
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-extrabold">{c.name} needs a rule</span>
                    <span className="text-[13px] text-sand">{c.itemCount} item{c.itemCount === 1 ? "" : "s"} waiting</span>
                  </span>
                  <span className="text-orange"><Icon name="arrow" size={20} strokeWidth={2.5} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unsorted.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="mx-1 text-xs font-bold tracking-[1.4px]">ITEMS WITHOUT A CATEGORY</h2>
          <ul className="rounded-2xl bg-white px-4 text-ink">
            {unsorted.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 border-b border-grey-100 py-3 last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 font-bold">{i.name}</span>
                  <span className="font-extrabold tabular-nums">{formatMoney(i.priceCents, group.currency)}</span>
                </div>
                <span className="text-[13px] text-grey-600">{i.storeName ?? "Receipt"}</span>
                <ItemCategoryPicker itemId={i.id} itemName={i.name} categoryId={null} categories={categories} tone="light" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </SubScreen>
  );
}
