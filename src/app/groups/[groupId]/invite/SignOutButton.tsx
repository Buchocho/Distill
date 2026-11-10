"use client";

/**
 * Sign out, at the bottom of the Invite people screen, which is where a person's own settings
 * live (their name in Distill). Runs in the browser. Ends the Supabase session on this device and
 * goes to Sign in (SPEC.md rule 1a, added 10 Nov 2026). Nothing in the group changes.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton({ email }: { email: string }) {
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
      <span className="text-[13px] text-grey-600">Signed in with Google as {email}</span>
      <button type="button" onClick={() => void signOut()} disabled={busy}
        className="min-h-11 px-4 text-[15px] font-bold text-red underline underline-offset-2 disabled:opacity-50">
        {busy ? "Signing out..." : "Sign out"}
      </button>
      {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
