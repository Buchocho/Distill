"use client";

/**
 * The scan card on the Receipts screen (screen 2): one compact row, as in the approved design.
 * Camera icon on the left; on the right the headline, then the orange "Take a photo" button and
 * the underlined "choose a file" link side by side. Kept short so the Unfinished and Recent lists
 * start higher on a phone (corrected 21 Nov 2026: the first build stacked everything).
 * A member scans only their own receipts, so the payer is always the person scanning (SPEC.md
 * rule 4). Someone holding another member's receipt sends them a photo to upload.
 * Runs in the browser.
 *
 * What happens on a photo: it is shrunk (src/lib/photos.ts), the receipt is started through the
 * API (which checks membership and picks the open period, SPEC.md rules 4 and 5), the photo is
 * uploaded straight to storage with the one-time link (architecture rule 6), and the review screen
 * opens, where the reading runs. Each stage shows what is happening, and any failure says what to do.
 * Story US2.
 * Approved design: canvas "Receipts.dc.html", 16 Nov 2026.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PHOTO_BUCKET, PhotoError, preparePhoto } from "@/lib/photos";

/** The scan card: camera icon, headline, photo button and file link in one row (story US2). */
export function ScanPanel({ groupId }: { groupId: string }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "preparing" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  // Runs once a photo is taken or chosen: prepare, start the receipt, upload, open the review screen.
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setStage("preparing");
      const photo = await preparePhoto(file);
      setStage("uploading");
      const res = await fetch(`/api/v1/groups/${groupId}/receipts`, {
        method: "POST",
      });
      const body = (await res.json()) as { receiptId?: string; upload?: { path: string; token: string }; error?: string };
      if (!res.ok || !body.receiptId || !body.upload) throw new Error(body.error ?? "Could not start the receipt.");
      const { error: uploadError } = await supabaseBrowser()
        .storage.from(PHOTO_BUCKET)
        .uploadToSignedUrl(body.upload.path, body.upload.token, photo, { contentType: "image/jpeg" });
      if (uploadError) throw new Error("The photo did not upload. Check your connection and try again.");
      router.push(`/groups/${groupId}/receipts/${body.receiptId}`);
    } catch (e) {
      setStage("idle");
      setError(e instanceof PhotoError || e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      if (camera.current) camera.current.value = "";
      if (picker.current) picker.current.value = "";
    }
  }

  const busy = stage !== "idle";
  const label = stage === "preparing" ? "Preparing photo..." : stage === "uploading" ? "Uploading..." : "Take a photo";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3.5 rounded-[20px] bg-dark-card p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-dark-line text-orange">
          <Icon name="camera" size={26} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
          <span className="text-[15px] font-extrabold leading-tight text-paper">Bought something? Scan it.</span>
          <div className="flex flex-wrap items-center gap-x-2.5">
            <button type="button" disabled={busy} onClick={() => camera.current?.click()}
              className="min-h-11 rounded-xl bg-orange px-4 text-sm font-extrabold text-ink disabled:opacity-70">
              {label}
            </button>
            <button type="button" disabled={busy} onClick={() => picker.current?.click()}
              className="min-h-11 text-[13px] font-bold text-sand underline underline-offset-[3px]">
              choose a file
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file inputs: camera capture and gallery/file picker */}
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Take a photo of the receipt" />
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Choose a photo of the receipt" />

      {error && <p role="alert" className="rounded-xl bg-red/10 p-3 text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
