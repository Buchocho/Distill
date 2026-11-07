"use client";

/**
 * The scan part of the Receipts screen (screen 2): Take a photo, or choose a file, and Paid by.
 * Runs in the browser.
 *
 * What happens on a photo: it is shrunk (src/lib/photos.ts), the receipt is started through the
 * API (which checks membership and picks the open period, SPEC.md rules 4 and 5), the photo is
 * uploaded straight to storage with the one time link (architecture rule 6), and the review screen
 * opens, where the reading runs. Each stage shows what is happening, and any failure says what to do.
 * Story US2.
 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PHOTO_BUCKET, PhotoError, preparePhoto } from "@/lib/photos";

type Member = { id: string; name: string };

/** The Take a photo button, the choose a file link and the Paid by choice. Defaults to the current user as payer (rule 4). */
export function ScanPanel({ groupId, members, me }: { groupId: string; members: Member[]; me: string }) {
  const router = useRouter();
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [paidBy, setPaidBy] = useState(me);
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paidBy }),
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
  // The return draws the orange Take a photo area, then the file link and Paid by on one line.
  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={busy} onClick={() => camera.current?.click()}
        className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[20px] bg-orange text-lg font-extrabold text-ink disabled:opacity-70">
        <Icon name="camera" size={34} />
        {stage === "preparing" ? "Preparing photo..." : stage === "uploading" ? "Uploading..." : "Take a photo"}
      </button>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Take a photo of the receipt" />
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Choose a photo of the receipt" />

      <div className="flex items-center gap-2.5 px-1">
        <button type="button" disabled={busy} onClick={() => picker.current?.click()}
          className="min-h-11 text-[15px] font-semibold text-paper underline">or choose a file</button>
        <span className="flex-1" />
        <label htmlFor="paidBy" className="text-sm text-sand">Paid by</label>
        <select id="paidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} disabled={busy}
          className="min-h-11 max-w-36 truncate rounded-lg bg-dark-card px-2 text-sm font-bold text-paper">
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.id === me ? `${m.name.split(" ")[0]} (you)` : m.name.split(" ")[0]}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-tint p-3 text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
