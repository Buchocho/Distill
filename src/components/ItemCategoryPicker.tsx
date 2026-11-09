"use client";

/**
 * Change a saved item's category (SPEC.md rule 13, story US4). Runs in the browser.
 * Any member can move an item to another category or back to unsorted while its period is open.
 * Saved through PATCH /api/v1/items/{id}; the change is logged and the page reloads to show it
 * (rule 14). Used on a saved receipt (dark) and on the Sort screen (orange journey).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

const UNSORTED = "";

export function ItemCategoryPicker({ itemId, itemName, categoryId, categories, tone }: {
  itemId: string;
  itemName: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
  tone: "dark" | "light";
}) {
  const router = useRouter();
  const [value, setValue] = useState(categoryId ?? UNSORTED);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saves the new category at once; on failure the old one is put back and the reason shown.
  async function change(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId: next || null }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const body = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      setValue(previous);
      setError(body.error ?? "Could not change the category. Try again.");
      return;
    }
    router.refresh();
  }

  const unsorted = value === UNSORTED;
  const look = tone === "dark"
    ? unsorted ? "border-2 border-orange bg-dark text-orange" : "border-0 bg-dark-line text-paper"
    : unsorted ? "border-2 border-orange-text bg-white text-orange-text" : "border-[1.5px] border-grey-200 bg-white text-ink";

  // The return draws the dropdown with the app's own arrow, and an error line when needed.
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="relative">
        <label htmlFor={`item-${itemId}`} className="sr-only">Category for {itemName}</label>
        <select id={`item-${itemId}`} value={value} disabled={busy} onChange={(e) => void change(e.target.value)}
          className={`min-h-11 w-full appearance-none truncate rounded-xl pl-3.5 pr-9 text-[15px] font-semibold disabled:opacity-60 ${look}`}>
          <option value={UNSORTED}>Unsorted</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><Icon name="chevron" size={14} strokeWidth={2.5} /></span>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
