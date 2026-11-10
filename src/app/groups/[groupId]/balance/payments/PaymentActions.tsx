"use client";

/**
 * The buttons on a payment that is still waiting (SPEC.md rule 25, story US9). Runs in the browser.
 * Used on the Payments screen and the period screen. The person paid sees "Confirm I received" and
 * Decline; the payer who recorded it sees Cancel. Confirmed payments have no buttons: they cannot change.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentActions({ paymentId, canConfirm, confirmLabel }: { paymentId: string; canConfirm: boolean; confirmLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sends the confirm or remove request, then reloads the list.
  async function send(action: "confirm" | "remove") {
    setBusy(true);
    setError(null);
    const res = await fetch(action === "confirm" ? `/api/v1/payments/${paymentId}/confirm` : `/api/v1/payments/${paymentId}`, {
      method: action === "confirm" ? "POST" : "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      return setError(b.error ?? "That did not work. Try again.");
    }
    router.refresh();
  }

  // The return draws Confirm and Decline for the other person, or Cancel for the recorder.
  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
      {canConfirm ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => void send("confirm")} className="min-h-11 flex-1 rounded-xl bg-orange px-3 text-sm font-extrabold text-ink disabled:opacity-40">
            {confirmLabel}
          </button>
          <button type="button" disabled={busy} onClick={() => void send("remove")} className="min-h-11 rounded-xl border border-grey-200 px-4 text-sm font-bold disabled:opacity-40">
            Decline
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => void send("remove")} className="min-h-11 self-start rounded-xl border border-grey-200 px-4 text-sm font-bold disabled:opacity-40">
          Cancel it
        </button>
      )}
    </div>
  );
}
