"use client";

/**
 * "Signed in as ..." and Sign out (SPEC.md rule 1a, added 10 Nov 2026). Runs in the browser.
 * Shown at the bottom of Invite people, where a person's own settings live, and on Start, so
 * someone who signed in with the wrong Google account can see it and switch at once. Ends the
 * Supabase session on this device and goes to Sign in. Nothing in any group changes.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton({ email, tone = "light" }: { email: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ends the session, then replaces the page so Back does not reopen the group.
  async function signOut() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabaseBrowser().auth.signOut();
    if (e) {
      setBusy(false);
      return setError("Could not sign out. Try again.");
    }
    router.replace("/login");
    router.refresh();
  }

  // The return draws who is signed in, the button, and any error.
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[13px] ${tone === "dark" ? "text-sand" : "text-grey-600"}`}>Signed in with Google as {email}</span>
      <button type="button" onClick={() => void signOut()} disabled={busy}
        className={`min-h-11 px-4 text-[15px] font-bold underline underline-offset-2 disabled:opacity-50 ${tone === "dark" ? "text-paper" : "text-red"}`}>
        {busy ? "Signing out..." : "Sign out"}
      </button>
      {error && <p role="alert" className={`text-sm font-semibold ${tone === "dark" ? "text-orange" : "text-red"}`}>{error}</p>}
    </div>
  );
}
