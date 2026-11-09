/**
 * Screen 4b, Sharing rule. Route: /groups/<id>/categories/<categoryId>. Story US3.
 * Shows who last changed the category's rule, with a link to History, and the rule form
 * (RuleForm.tsx, SPEC.md rules 11 and 13a). Orange (approved design, RuleEditor2). Members only.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SubScreen } from "@/components/SubScreen";
import { requireUser } from "@/server/session";
import { getCategory } from "@/server/services/categories";
import { ServiceError } from "@/server/services/errors";
import { longDate } from "@/domain/dates";
import { RuleForm } from "./RuleForm";

export const dynamic = "force-dynamic";

export default async function RuleScreen({ params }: { params: Promise<{ groupId: string; categoryId: string }> }) {
  const { groupId, categoryId } = await params;
  const user = await requireUser(`/groups/${groupId}/categories/${categoryId}`);
  const data = await getCategory(user.id, categoryId).catch((e) => {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  });
  if (data.category.groupId !== groupId) notFound();
  const last = data.lastChange;

  // The return draws the last change line and the rule form.
  return (
    <SubScreen groupId={groupId} tab="categories" backHref={`/groups/${groupId}/categories`} backLabel="Back to categories" title={data.category.name}>
      {last && (
        <Link href={`/groups/${groupId}/categories/history`} className="mx-1 inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-ink">
          <Icon name="clock" size={16} strokeWidth={2.2} />
          {last.summary} by {last.by.split(" ")[0]}, {longDate(last.changedAt.toISOString().slice(0, 10))}
        </Link>
      )}
      <RuleForm groupId={groupId} categoryId={data.category.id} categoryName={data.category.name} rule={data.rule} members={data.members} me={user.id} />
    </SubScreen>
  );
}
