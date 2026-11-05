"use client";

/**
 * The "Continue with Google" button on Sign in. Runs in the browser.
 * Hands the user to Google through Supabase; Google returns them to /auth/callback, which then
 * opens the page in `next`.
 */

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "@/components/Icon";

export function SignInButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: e } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (e) {
      setError("Sign in did not start. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="flex min-h-13 items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-ink bg-white text-base font-bold text-ink disabled:opacity-60"
      >
        <Icon name="user" />
        {busy ? "Opening Google..." : "Continue with Google"}
      </button>
      {error && <p role="alert" className="text-center text-sm font-semibold text-red">{error}</p>}
    </div>
  );
}
