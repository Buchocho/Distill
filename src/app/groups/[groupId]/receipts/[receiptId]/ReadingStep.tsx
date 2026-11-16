"use client";

/**
 * The reading state of the review screen (screen 3), shown before the items are ready.
 *
 * A freshly uploaded receipt (draft) starts its reading as soon as this appears. When a
 * reading is refused by a limit (20 a day, one at a time) or Gemini is busy, it says so
 * (rule 10a). A receipt already being read is checked again every few seconds. A failed
 * reading shows Retry, which reads the same photo again (SPEC.md rule 10), or Delete for
 * a photo that will never read well (rule 9b).
 *
 * The reading state shows the Distill-by-Atheria branded mark with the animated orange
 * bar, matching the page loading screen. The failure state keeps its action buttons.
 *
 * SPEC.md rules 9b, 10, 10a. Section 5 (branding).
 */

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeleteReceipt } from "./DeleteReceipt";
import { deviceToday } from "@/domain/dates";

export function ReadingStep({ receiptId, groupId, status }: { receiptId: string; groupId: string; status: "draft" | "reading" | "failed" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(status !== "failed");
  const [failed, setFailed] = useState(status === "failed");
  // Why it did not read, when it is not the photo: a limit, or Gemini busy (rule 10a).
  const [why, setWhy] = useState<string | null>(null);
  const started = useRef(false);

  // Asks the server to read the photo, then reloads the page to show the result.
  const read = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    setWhy(null);
    try {
      // The phone's own date helps read dates printed in an unusual order (SPEC.md rule 2c).
      const res = await fetch(`/api/v1/receipts/${receiptId}/read`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ localDate: deviceToday() }),
      });
      const body = (await res.json()) as { status?: string; reason?: string; error?: string };
      // Over a limit: nothing was read, so say why instead of blaming the photo.
      if (res.status === 429) setWhy(body.error ?? "Too many readings. Try again later.");
      else if (body.reason === "busy") setWhy("Receipt reading is busy right now. Try again in a minute.");
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

  // Failure state: Retry and Delete buttons, unchanged from the original.
  if (failed) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-2xl bg-dark-card p-5">
        <p className="font-bold">{why ? "Not read yet" : "We couldn’t read this receipt"}</p>
        <p className="text-sm text-sand">
          {why ?? "The photo is kept. Try reading it again. If it fails again, take a clearer photo with the whole receipt in view."}
        </p>
        <button type="button" onClick={() => void read()} className="min-h-13 rounded-xl bg-orange font-extrabold text-ink">Retry</button>
        <DeleteReceipt receiptId={receiptId} groupId={groupId} />
      </div>
    );
  }

  // Reading state: branded Distill mark with animated bar, matching the page loading screen.
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      {/* Distill wordmark */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-start gap-1.5">
          <span className="text-[44px] font-extrabold leading-[0.9] tracking-[-0.045em] text-paper">
            Distill
          </span>
          <span className="mt-1 size-2.5 shrink-0 rounded-full bg-orange" />
        </div>

        {/* Animated underline bar */}
        <div className="w-[130px]">
          <span
            className="block h-1 rounded-full bg-orange"
            style={{ animation: "underline 1s ease-in-out infinite alternate" }}
          />
        </div>

        {/* "by Atheria" */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[11px] text-grey-600">by</span>
          <img
            src="/atheria-wordmark.png"
            alt="Atheria"
            className="block h-3.5 w-auto opacity-70"
          />
        </div>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1 pt-1.5">
        <p className="text-[17px] font-extrabold text-paper">
          {busy ? "Reading your receipt" : "Waiting for the reading"}
        </p>
        <p className="text-[13px] text-sand">
          This usually takes 10 to 30 seconds.
        </p>
      </div>

      {/* Delete link (the receipt photo is kept, so this is a soft action) */}
      <DeleteReceipt receiptId={receiptId} groupId={groupId} />
    </div>
  );
}
