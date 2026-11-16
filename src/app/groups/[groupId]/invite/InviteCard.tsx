"use client";

/**
 * The warm invite card on the Group screen: a headline, a note, the link in a white pill,
 * and Share + Copy buttons. Replaces the old CopyLink for the redesigned Group page.
 * Approved design: canvas "Group.dc.html", 16 Nov 2026. Story US1.
 */

import { useState } from "react";

export function InviteCard({ url, groupName }: { url: string; groupName: string }) {
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
    if (navigator.share) await navigator.share({ title: `Join ${groupName} on Distill`, url }).catch(() => undefined);
    else await copy();
  }

  // The warm orange-tint card with the invite link, Share link button and Copy button.
  return (
    <div className="flex flex-col gap-[11px] rounded-[18px] bg-orange-tint p-3.5">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-extrabold text-ink">Invite the people you shop with</span>
        <span className="text-xs text-orange-text">They sign in with Google and join this group.</span>
      </div>
      <div className="truncate rounded-[11px] bg-white px-3 py-2.5 text-xs font-semibold text-grey-700">
        {url}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={share}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-ink text-sm font-extrabold text-paper">
          Share link
        </button>
        <button type="button" onClick={copy} aria-live="polite"
          className="min-h-11 rounded-xl border-[1.5px] border-ink bg-transparent px-[18px] text-sm font-extrabold text-ink">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
