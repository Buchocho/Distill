"use client";

/**
 * The reading state of the review screen (screen 3), shown before the items are ready. Runs in the browser.
 *
 * A freshly uploaded receipt (draft) starts its reading as soon as this appears. A receipt already
 * being read is checked again every few seconds. A failed reading shows Retry, which reads the same
 * photo again (SPEC.md rule 10), or Delete for a photo that will never read well (rule 9b).
 * When the reading is done the page reloads with the review form.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeleteReceipt } from "./DeleteReceipt";

export function ReadingStep({ receiptId, groupId, status }: { receiptId: string; groupId: string; status: "draft" | "reading" | "failed" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(status !== "failed");
  const [failed, setFailed] = useState(status === "failed");
  const started = useRef(false);

  // Asks the server to read the photo, then reloads the page to show the result.
  const read = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/v1/receipts/${receiptId}/read`, { method: "POST" });
      const body = (await res.json()) as { status?: string };
      if (!res.ok || body.status !== "ready") throw new Error("failed");
      router.refresh();
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }, [receiptId, router]);

  useEffect(() => {
    if (status === "draft" && !started.current) {
      started.current = true;
      void read();
    }
    // Someone else's reading is still running: look again every 5 seconds.
    if (status === "reading") {
      const timer = setInterval(() => router.refresh(), 5000);
      return () => clearInterval(timer);
    }
  }, [status, read, router]);

  // The return shows either the "reading" message or the failure message with Retry.
  if (failed) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-dark-card p-5">
        <p className="font-bold">We couldn&apos;t read this receipt</p>
        <p className="text-sm text-sand">The photo is kept. Try reading it again. If it fails again, take a clearer photo with the whole receipt in view.</p>
        <button type="button" onClick={() => void read()} className="min-h-13 rounded-xl bg-orange font-extrabold text-ink">Retry</button>
        <DeleteReceipt receiptId={receiptId} groupId={groupId} />
      </div>
    );
  }
  return (
    <div aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl bg-dark-card p-8 text-center">
      <span className="size-8 animate-spin rounded-full border-4 border-dark-line border-t-orange" aria-hidden="true" />
      <p className="font-bold">{busy ? "Reading your receipt..." : "Waiting for the reading..."}</p>
      <p className="text-sm text-sand">This usually takes 10 to 30 seconds.</p>
    </div>
  );
}
