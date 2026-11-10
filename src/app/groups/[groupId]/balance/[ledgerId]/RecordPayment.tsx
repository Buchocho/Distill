"use client";

/**
 * Record a payment, on an agreed period's own line "You owe Rui" (SPEC.md rule 24, story US9,
 * approved design AgreedPeriodRecord, 10 Nov 2026). Runs in the browser.
 * Only the person who paid records it, so who paid, who was paid and the period are already known:
 * the form asks only for the amount (part payments allowed, at most what is left after payments
 * still waiting) and the date, which starts at the device's today (rule 2c). The server checks
 * everything again. The payment then waits for the person paid to confirm (rule 25).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { currencyAffix, formatCents, formatMoney, parseAmount } from "@/domain/money";
import { deviceToday } from "@/domain/dates";

export function RecordPayment({ ledgerId, toUser, toName, capCents, currency }: {
  ledgerId: string;
  toUser: string;
  toName: string;
  capCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(formatCents(capCents, currency));
  const [paidOn, setPaidOn] = useState(deviceToday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { prefix, suffix } = currencyAffix(currency);

  // Checks the amount here for a quick message, then sends it; the server applies the same rules.
  async function save() {
    const cents = parseAmount(amount);
    if (cents === null || cents <= 0) return setError("Enter an amount above zero.");
    if (cents > capCents) return setError(`That is more than is left to pay: at most ${formatMoney(capCents, currency)}.`);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/periods/${ledgerId}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUser, amountCents: cents, paidOn }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      return setError(b.error ?? "Could not record the payment. Try again.");
    }
    setOpen(false);
    router.refresh();
  }

  // The return draws the Record a payment button, or the small form under the line once opened.
  if (!open) {
    return (
      <button type="button" onClick={() => { setAmount(formatCents(capCents, currency)); setOpen(true); }}
        className="min-h-11 rounded-xl border-[1.5px] border-ink bg-white text-[15px] font-extrabold">
        Record a payment
      </button>
    );
  }
  return (
    <form className="flex flex-col gap-2.5 rounded-xl border-2 border-ink p-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <span className="text-sm font-extrabold">You paid {toName}</span>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-grey-600">
          AMOUNT
          <span className="flex h-12 items-center gap-1 rounded-[10px] border-[1.5px] border-grey-200 px-3 text-lg font-extrabold text-ink">
            {prefix && <span>{prefix}</span>}
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" className="w-full min-w-0 bg-transparent tabular-nums outline-none" />
            {suffix && <span>{suffix}</span>}
          </span>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-grey-600">
          DATE PAID
          <input type="date" value={paidOn} max={deviceToday()} onChange={(e) => setPaidOn(e.target.value)} aria-label="Date paid"
            className="h-12 min-w-0 rounded-[10px] border-[1.5px] border-grey-200 px-2 text-base font-normal text-ink" />
        </label>
      </div>
      <span className="text-[13px] text-grey-600">
        Up to {formatMoney(capCents, currency)}. You can pay part of it; the rest stays owed. {toName} confirms it before it counts.
      </span>
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="min-h-11 flex-1 rounded-xl bg-orange px-3 text-sm font-extrabold text-ink disabled:opacity-40">
          {busy ? "Recording..." : "Record payment"}
        </button>
        <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(null); }} className="min-h-11 rounded-xl border-[1.5px] border-grey-200 px-4 text-sm font-bold">
          Close
        </button>
      </div>
    </form>
  );
}
