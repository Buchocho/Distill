"use client";

/**
 * Share and Copy buttons for the invite link. Runs in the browser.
 * Share opens the phone's share sheet (WhatsApp, Messages and so on); where that is not available,
 * for example on most laptops, it copies the link instead.
 */

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  async function share() {
    if (navigator.share) await navigator.share({ title: "Join my group on Distill", url }).catch(() => undefined);
    else await copy();
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="break-all rounded-xl border-[1.5px] border-grey-200 bg-white p-3.5 text-sm text-grey-700">{url}</div>
      <button type="button" onClick={share} className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-orange text-base font-extrabold text-ink">
        <Icon name="link" /> Share invite link
      </button>
      <button type="button" onClick={copy} className="min-h-11 text-[15px] font-bold text-orange-text" aria-live="polite">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
