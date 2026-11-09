"use client";

/**
 * Delete receipt, with a confirm step inside the app. Runs in the browser.
 * Used on the review screen and the "couldn't read" screen, for receipts not yet saved
 * (SPEC.md rule 9b). The first tap asks; the second deletes the receipt and its photo through
 * DELETE /api/v1/receipts/{id} and goes back to the Receipts list.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteReceipt({ receiptId, groupId, compact = false }: { receiptId: string; groupId: string; compact?: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deletes for real, then returns to the list. A failure keeps the person here with a message.
  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/receipts/${receiptId}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      const body = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      setError(body.error ?? "Could not delete. Try again.");
      return;
    }
    router.push(`/groups/${groupId}/receipts`);
    router.refresh();
  }

  // The return draws either the Delete button, or the question with Cancel and Delete.
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)}
        className={`min-h-13 rounded-xl border-[1.5px] border-dark-line px-4 font-bold text-paper ${compact ? "" : "w-full"}`}>
        Delete
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-labelledby={`del-${receiptId}`} className="flex w-full flex-col gap-2.5 rounded-2xl bg-dark-card p-4">
      <p id={`del-${receiptId}`} className="font-bold">Delete this receipt and its photo?</p>
      <p className="text-sm text-sand">This can&apos;t be undone.</p>
      {error && <p role="alert" className="text-sm font-semibold text-orange">{error}</p>}
      <div className="flex gap-2.5">
        <button type="button" onClick={() => setAsking(false)} disabled={busy}
          className="min-h-12 flex-1 rounded-xl border-[1.5px] border-paper font-bold text-paper">Cancel</button>
        <button type="button" onClick={() => void remove()} disabled={busy}
          className="min-h-12 flex-1 rounded-xl bg-red font-extrabold text-paper disabled:opacity-60">{busy ? "Deleting..." : "Delete"}</button>
      </div>
    </div>
  );
}
