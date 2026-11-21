"use client";

/**
 * The app's web address as the visitor sees it (for example distill-ma7f.vercel.app), shown in
 * the laptop panel so they can type it on their phone. Read from the browser, so it is always the
 * address actually in use, on production or a preview. Runs in the browser.
 */

import { useSyncExternalStore } from "react";

const noChange = () => () => {};

/** The current site address in bold, or "this address" before the browser has it. */
export function PhoneAddress() {
  const host = useSyncExternalStore(noChange, () => window.location.host, () => "");
  return <strong className="font-bold text-paper">{host || "this address"}</strong>;
}
