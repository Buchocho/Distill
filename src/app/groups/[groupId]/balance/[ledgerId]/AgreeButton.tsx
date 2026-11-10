"use client";

/**
 * Agree, on the Close the period screen (SPEC.md rules 21 and 22, story US8). Runs in the browser.
 * Each member agrees to their own amount. The button is off while items are left to sort, with the
 * reason shown. When the last member agrees, the period's amounts are frozen.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgreeButton({ ledgerId, blockedBy, agreed }: { ledgerId: string; blockedBy: string | null; agreed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Records the agreement, then reloads to show who has agreed.
  async function agree() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/periods/${ledgerId}/agree`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      return setError(b.error ?? "Could not agree. Try again.");
    }
    router.refresh();
  }

  // The return draws the reason Agree is closed, the button, and any error.
  if (agreed) return <p className="rounded-xl bg-grey-100 p-3.5 text-center font-bold">You agreed. Waiting for the others.</p>;
  return (
    <div className="flex flex-col gap-2">
      {blockedBy && <p className="px-1 text-sm font-semibold text-orange-text">{blockedBy}</p>}
      {error && <p role="alert" className="px-1 text-sm font-semibold text-red">{error}</p>}
      <button type="button" onClick={() => void agree()} disabled={busy || blockedBy !== null}
        className="min-h-13 rounded-xl bg-ink font-extrabold text-paper disabled:opacity-40">
        {busy ? "Agreeing..." : "Agree to my amount"}
      </button>
    </div>
  );
}
