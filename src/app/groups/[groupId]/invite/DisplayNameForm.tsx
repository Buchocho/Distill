"use client";

/**
 * "Your name in Distill" on the Group screen settings card. Runs in the browser.
 * Shows as a compact row (label + current name + chevron) until tapped, then expands to an
 * editable field with Save. Lets a person replace their Google name with the name they go by,
 * for example "Butch", in every group (SPEC.md rule 1). Saved through PATCH /api/v1/me; the
 * page then reloads so the member list shows the new name.
 * Approved design: canvas "Group.dc.html" settings row, 16 Nov 2026.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISPLAY_NAME_MAX } from "@/domain/users";

export function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Saves the name; a message from the server (empty or too long) is shown under the field.
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { fields?: { displayName?: string }; error?: string }) : {};
    if (!res || !res.ok) {
      setState("idle");
      setError(body.fields?.displayName ?? body.error ?? "Could not save. Try again.");
      return;
    }
    setState("saved");
    setEditing(false);
    router.refresh();
  }

  // Collapsed: a settings row showing the label and current name with a chevron.
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)}
        className="flex min-h-[60px] w-full items-center gap-[11px] text-left">
        <span className="flex flex-1 flex-col">
          <span className="text-xs text-grey-600">Your name in Distill</span>
          <span className="text-[15px] font-bold">{current}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f48d3c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    );
  }

  // Expanded: the editable field with Save.
  return (
    <form onSubmit={save} className="flex flex-col gap-2 py-3">
      <label htmlFor="displayName" className="text-xs text-grey-600">Your name in Distill</label>
      <div className="flex gap-2">
        <input id="displayName" value={name} maxLength={DISPLAY_NAME_MAX}
          onChange={(e) => { setName(e.target.value); setState("idle"); }}
          aria-invalid={Boolean(error)} aria-describedby="displayName-help"
          className="min-h-11 min-w-0 flex-1 rounded-[11px] border-[1.5px] border-grey-400 bg-white px-3 text-[15px] text-ink" />
        <button type="submit" disabled={state === "saving" || name.trim() === current}
          className="min-h-11 rounded-[11px] bg-ink px-4 text-sm font-extrabold text-paper disabled:opacity-40">
          {state === "saving" ? "..." : "Save"}
        </button>
      </div>
      <p id="displayName-help" role={error ? "alert" : undefined} className={`text-xs ${error ? "font-semibold text-red" : "text-grey-600"}`}>
        {error ?? (state === "saved" ? "Saved." : "The name everyone in your groups sees.")}
      </p>
      <button type="button" onClick={() => { setEditing(false); setName(current); setState("idle"); setError(null); }}
        className="self-start text-xs font-bold text-grey-600">Cancel</button>
    </form>
  );
}
