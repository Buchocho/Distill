"use client";

/**
 * Shown when a screen fails to load for an unexpected reason (CLAUDE.md: every screen has an
 * error state with a retry). "Try again" reloads the screen that failed.
 */

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-4 bg-paper px-5 text-ink">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="text-grey-700">Check your connection and try again.</p>
      <button type="button" onClick={reset} className="min-h-13 rounded-xl bg-orange font-extrabold text-ink">Try again</button>
    </main>
  );
}
