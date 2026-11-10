"use client";

/**
 * Remove a leftover item from a closed period (SPEC.md rule 20). Runs in the browser.
 * Shown only to the person who paid for the item's receipt. Asks once in the app, then removes it
 * through DELETE /api/v1/items/{id}; the removal is logged and clears agreements given so far.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveItem({ itemId, itemName }: { itemId: string; itemName: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Removes the item, then reloads the screen.
  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/v1/items/${itemId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      return setError(b.error ?? "Could not remove it. Try again.");
    }
    router.refresh();
  }

  // The return draws Remove, or the question with Cancel and Remove.
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="min-h-11 shrink-0 rounded-xl border-[1.5px] border-grey-200 px-3 text-sm font-bold">
        Remove
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={`Remove ${itemName}?`} className="flex w-full flex-col gap-2 rounded-xl bg-grey-100 p-3">
      <p className="text-sm font-bold">Remove {itemName} from this period?</p>
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setAsking(false)} className="min-h-11 flex-1 rounded-xl border-[1.5px] border-ink text-sm font-bold">Cancel</button>
        <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-11 flex-1 rounded-xl bg-red text-sm font-extrabold text-paper">
          {busy ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}
