/**
 * Screen 3, Review receipt. Route: /groups/<id>/receipts/<receiptId>. Stories US2, US4 and US5.
 *
 * Shows a receipt in whichever state it is in:
 * - being read (draft or reading): ReadingStep starts or waits for the reading;
 * - failed: ReadingStep shows Retry (SPEC.md rule 10) and Delete (rule 9b);
 * - ready: ReviewForm, to check, correct, save or delete (rules 6 to 9c);
 * Before saving, only the person who scanned it sees these; other members see that it is still
 * being added (rule 4).
 * - saved: the saved items. Any member can change an item's category while the period is open,
 *   and each change is shown under the item with who made it (story US4, SPEC.md rules 13, 14).
 *   The name and price cannot change after saving.
 * Dark like the rest of the Receipts journey (approved design, Review2). Members only.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TabBar } from "@/components/TabBar";
import { ItemCategoryPicker } from "@/components/ItemCategoryPicker";
import { requireUser } from "@/server/session";
import { getReceipt } from "@/server/services/receipts";
import { ServiceError } from "@/server/services/errors";
import { formatMoney } from "@/domain/money";
import { ReadingStep } from "./ReadingStep";
import { ReviewForm } from "./ReviewForm";
import { longDate } from "@/domain/dates";

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
  const payer = data.members.find((m) => m.id === receipt.paidBy)?.name.split(" ")[0] ?? "";
  // Only the person who scanned a receipt reads, reviews, saves or deletes it (SPEC.md rule 4).
  const mine = receipt.createdBy === user.id;

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
        {mine && (receipt.status === "draft" || receipt.status === "reading" || receipt.status === "failed") && (
          <ReadingStep receiptId={receipt.id} groupId={groupId} status={receipt.status} />
        )}

        {mine && receipt.status === "ready" && (
          <ReviewForm receiptId={receipt.id} groupId={groupId} currency={currency} storeName={receipt.storeName}
            purchaseDate={receipt.purchaseDate} totalCents={receipt.totalCents}
            items={data.items} categories={data.categories} photoCount={data.photoCount}
            receiptNumber={receipt.receiptNumber} saved={data.saved} />
        )}

        {!mine && receipt.status !== "saved" && (
          <div className="rounded-2xl bg-dark-card p-5">
            <p className="font-bold">{payer} is still adding this receipt</p>
            <p className="mt-1 text-sm text-sand">It counts once {payer} has checked and saved it.</p>
          </div>
        )}

        {receipt.status === "saved" && (
          <>
            <div className="flex flex-col gap-0.5 rounded-2xl bg-dark-card px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[17px] font-extrabold">{receipt.storeName ?? "Receipt"}</span>
                {receipt.totalCents !== null && <span className="text-[22px] font-extrabold tabular-nums">{formatMoney(receipt.totalCents, currency)}</span>}
              </div>
              <div className="flex items-center justify-between text-[13px] text-sand">
                <span>{receipt.purchaseDate ? longDate(receipt.purchaseDate) : "No date"} · Paid by {payer}{receipt.receiptNumber ? ` · No. ${receipt.receiptNumber}` : ""}</span>
                {data.photoCount > 0 && <a href={`/api/v1/receipts/${receipt.id}/photos/1`} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center font-bold text-orange underline underline-offset-2">See photo</a>}
              </div>
            </div>
            <ul className="rounded-2xl bg-dark-card px-4">
              {data.items.map((item) => {
                const changes = data.history.filter((h) => h.itemId === item.id);
                return (
                  <li key={item.id} className="flex flex-col gap-2 border-b border-dark-line py-3 last:border-0">
                    <span className="text-base font-bold">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <ItemCategoryPicker itemId={item.id} itemName={item.name} categoryId={item.categoryId} categories={data.categories} tone="dark" />
                      <span className="flex h-11 shrink-0 items-center text-[23px] font-extrabold tabular-nums">{formatMoney(item.priceCents, currency)}</span>
                    </div>
                    {item.discountCents !== null && (
                      <span className="self-end text-[13px] font-semibold text-sand">Discount {formatMoney(item.discountCents, currency)} (already in the price)</span>
                    )}
                    {changes.length > 0 && (
                      <ul aria-label={`Changes to ${item.name}`} className="flex flex-col gap-0.5 text-[13px] italic text-sand">
                        {changes.map((c, i) => (
                          <li key={i}>{c.summary} by {c.by.split(" ")[0]}, {longDate(c.at.toISOString().slice(0, 10))}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <TabBar groupId={groupId} active="receipts" />
    </main>
  );
}
