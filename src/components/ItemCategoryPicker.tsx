"use client";

/**
 * Change a saved item's category (SPEC.md rule 13, story US4). Runs in the browser.
 * Any member can move an item to another category or back to unsorted while its period is open.
 * "New category..." creates a category on the spot and puts the item in it (rule 14a; added 10 Nov
 * 2026 so categories are not only made while scanning). A name already used in the group, ignoring
 * capitals, reuses that category. A new category starts with no rule, so the item then shows as
 * needing a rule (rule 12).
 * Saved through PATCH /api/v1/items/{id}; the change is logged and the page reloads to show it
 * (rule 14). Used on a saved receipt (dark), the Sort screen and the closed period screen (light).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

const UNSORTED = "";
const NEW = "__new";

export function ItemCategoryPicker({ groupId, itemId, itemName, categoryId, categories, tone }: {
  groupId: string;
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
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  // Creates the typed category, or finds one with the same name, then moves the item into it.
  async function addAndChange() {
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setAdding(false);
      return change(existing.id);
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/groups/${groupId}/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: { name?: string } }) : {};
    setBusy(false);
    if (!res || !res.ok || !body.id) return setError(body.fields?.name ?? body.error ?? "Could not add the category. Try again.");
    setAdding(false);
    setNewName("");
    return change(body.id);
  }

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
        <select id={`item-${itemId}`} value={adding ? NEW : value} disabled={busy}
          onChange={(e) => (e.target.value === NEW ? setAdding(true) : (setAdding(false), void change(e.target.value)))}
          className={`min-h-11 w-full appearance-none truncate rounded-xl pl-3.5 pr-9 text-[15px] font-semibold disabled:opacity-60 ${look}`}>
          <option value={UNSORTED}>Unsorted</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value={NEW}>New category...</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><Icon name="chevron" size={14} strokeWidth={2.5} /></span>
      </div>
      {adding && (
        <div className="flex items-center gap-2">
          <input aria-label={`New category for ${itemName}`} value={newName} maxLength={40} autoFocus placeholder="For example, Orange juice"
            onChange={(e) => setNewName(e.target.value)}
            className={`min-h-11 min-w-0 flex-1 rounded-xl px-3 text-[15px] ${tone === "dark" ? "border border-dark-line bg-dark text-paper" : "border-[1.5px] border-grey-400 bg-white text-ink"}`} />
          <button type="button" onClick={() => void addAndChange()} disabled={busy || !newName.trim()}
            className="min-h-11 rounded-xl bg-orange px-4 font-bold text-ink disabled:opacity-50">Add</button>
          <button type="button" onClick={() => { setAdding(false); setNewName(""); }}
            className="min-h-11 px-2 text-sm font-bold underline">Cancel</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
