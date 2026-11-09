"use client";

/**
 * "Add category" on the Categories screen (SPEC.md rule 14a). Runs in the browser.
 * Opens a name field; saving creates the category with no rule and opens its rule screen, so the
 * person can say who shares it straight away.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { CATEGORY_NAME_MAX } from "@/domain/receipts";

export function AddCategory({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creates the category, then goes to its rule screen.
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/groups/${groupId}/categories`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { id?: string; error?: string; fields?: { name?: string } }) : {};
    setBusy(false);
    if (!res || !res.ok || !body.id) return setError(body.fields?.name ?? body.error ?? "Could not add it. Try again.");
    router.push(`/groups/${groupId}/categories/${body.id}`);
  }

  // The return draws the Add category button, or the name field with Add and Cancel.
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink font-extrabold text-ink">
        <Icon name="plus" size={20} strokeWidth={2.5} />Add category
      </button>
    );
  }
  return (
    <form onSubmit={add} className="flex flex-col gap-2 rounded-2xl bg-white p-4">
      <label htmlFor="newCategory" className="text-sm font-bold">New category</label>
      <input id="newCategory" value={name} onChange={(e) => setName(e.target.value)} maxLength={CATEGORY_NAME_MAX} autoFocus
        placeholder="For example, Orange juice" className="min-h-12 rounded-xl border-[1.5px] border-grey-400 px-3 text-base text-ink" />
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setOpen(false); setName(""); setError(null); }}
          className="min-h-12 flex-1 rounded-xl border-[1.5px] border-ink font-bold">Cancel</button>
        <button type="submit" disabled={busy || !name.trim()} className="min-h-12 flex-1 rounded-xl bg-ink font-extrabold text-paper disabled:opacity-40">
          {busy ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
