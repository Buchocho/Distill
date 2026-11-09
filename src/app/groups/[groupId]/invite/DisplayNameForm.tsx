"use client";

/**
 * "Your name in Distill" on the members screen. Runs in the browser.
 * Lets a person replace their Google name with the name they go by, for example "Butch",
 * in every group (SPEC.md rule 1). Saved through PATCH /api/v1/me; the page then reloads so the
 * member list shows the new name.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISPLAY_NAME_MAX } from "@/domain/users";

export function DisplayNameForm({ current }: { current: string }) {
  const router = useRouter();
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
    router.refresh();
  }

  // The return draws the label, the field with a Save button, and the result or error line.
  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="displayName" className="text-sm font-bold">Your name in Distill</label>
      <div className="flex gap-2">
        <input id="displayName" value={name} maxLength={DISPLAY_NAME_MAX} onChange={(e) => { setName(e.target.value); setState("idle"); }}
          aria-invalid={Boolean(error)} aria-describedby="displayName-help"
          className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-grey-400 bg-white px-3 text-base text-ink" />
        <button type="submit" disabled={state === "saving" || name.trim() === current}
          className="min-h-12 rounded-xl bg-ink px-5 font-extrabold text-paper disabled:opacity-40">
          {state === "saving" ? "Saving..." : "Save"}
        </button>
      </div>
      <p id="displayName-help" role={error ? "alert" : undefined} className={`text-[13px] ${error ? "font-semibold text-red" : "text-grey-600"}`}>
        {error ?? (state === "saved" ? "Saved. Everyone in your groups now sees this name." : "The name everyone in your groups sees.")}
      </p>
    </form>
  );
}
