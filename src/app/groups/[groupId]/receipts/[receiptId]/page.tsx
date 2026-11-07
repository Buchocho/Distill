/**
 * Screen 3, Review receipt. Route: /groups/<id>/receipts/<receiptId>. Stories US2, US4 and US5.
 *
 * Shows a receipt in whichever state it is in:
 * - being read (draft or reading): ReadingStep starts or waits for the reading;
 * - failed: ReadingStep shows Retry (SPEC.md rule 10);
 * - ready: ReviewForm, to check, correct and save (rules 6 to 9);
 * - saved: the saved items with their categories, read only. Changing items after saving
 *   (story US4, with the change log) is built in step 3.
 * Dark like the rest of the Receipts journey (approved design, Review2). Members only.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TabBar } from "@/components/TabBar";
import { requireUser } from "@/server/session";
import { getReceipt } from "@/server/services/receipts";
import { ServiceError } from "@/server/services/errors";
import { formatCents, formatMoney } from "@/domain/money";
import { ReadingStep } from "./ReadingStep";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

/** Loads the receipt, or shows Not found when it does not exist or the user is not in its group. */
async function load(userId: string, receiptId: string) {
  try {
    return await getReceipt(userId, receiptId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  }
}

export default async function ReviewReceipt({ params }: { params: Promise<{ groupId: string; receiptId: string }> }) {
  const { groupId, receiptId } = await params;
  const user = await requireUser(`/groups/${groupId}/receipts/${receiptId}`);
  const data = await load(user.id, receiptId);
  if (data.receipt.groupId !== groupId) notFound();
  const { receipt, currency } = data;
  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
  const payer = data.members.find((m) => m.id === receipt.paidBy)?.name.split(" ")[0] ?? "";

  // The return draws the back link and title, then the part that matches the receipt's state.
  return (
    <main className="flex min-h-dvh flex-col bg-dark text-paper">
      <header className="flex items-center gap-2 px-3 pb-1 pt-3">
        <Link href={`/groups/${groupId}/receipts`} aria-label="Back to receipts" className="grid size-11 place-items-center rounded-xl text-paper">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="flex-1 text-xl font-extrabold">{receipt.status === "saved" ? receipt.storeName ?? "Receipt" : "Review receipt"}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 px-3 pt-1">
        {(receipt.status === "draft" || receipt.status === "reading" || receipt.status === "failed") && (
          <ReadingStep receiptId={receipt.id} status={receipt.status} />
        )}

        {receipt.status === "ready" && (
          <ReviewForm receiptId={receipt.id} groupId={groupId} currency={currency} storeName={receipt.storeName}
            purchaseDate={receipt.purchaseDate} totalCents={receipt.totalCents} paidBy={receipt.paidBy} me={user.id}
            items={data.items} categories={data.categories} members={data.members} photoLinks={data.photoLinks} />
        )}

        {receipt.status === "saved" && (
          <>
            <div className="flex flex-col gap-0.5 rounded-2xl bg-dark-card px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[17px] font-extrabold">{receipt.storeName ?? "Receipt"}</span>
                {receipt.totalCents !== null && <span className="text-[22px] font-extrabold tabular-nums">{formatMoney(receipt.totalCents, currency)}</span>}
              </div>
              <div className="flex items-center justify-between text-[13px] text-sand">
                <span>{receipt.purchaseDate ?? "No date"} · Paid by {payer}</span>
                {data.photoLinks[0] && <a href={data.photoLinks[0]} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center font-bold text-orange">See photo</a>}
              </div>
            </div>
            <ul className="rounded-2xl bg-dark-card px-4">
              {data.items.map((item) => (
                <li key={item.id} className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 border-b border-dark-line py-2.5 last:border-0">
                  <span className="text-[15px] font-bold">{item.name}</span>
                  <span className="text-[15px] font-bold tabular-nums">{formatCents(item.priceCents, currency)}</span>
                  {item.categoryId ? (
                    <span className="text-[13px] text-sand">{categoryName.get(item.categoryId)}</span>
                  ) : (
                    <span className="inline-flex h-[26px] w-fit items-center rounded-full bg-orange px-2.5 text-xs font-bold text-ink">No category</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <TabBar groupId={groupId} active="receipts" />
    </main>
  );
}
