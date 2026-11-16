/**
 * Branded loading screen shown between slow page navigations.
 *
 * Next.js shows this via Suspense while a server component is still streaming.
 * Most navigations finish fast enough that the user never sees it; it matters
 * for the first load and for heavier pages like balance or receipt review.
 *
 * Shows the Distill wordmark with the animated orange underline bar and
 * "by Atheria" beneath it. No fade-in delay: Butch decided only the slowest
 * screens should show this, so when it appears it should appear immediately.
 *
 * SPEC.md section 5 (branding). Architecture rule A3 (no business logic here).
 */

/* eslint-disable @next/next/no-img-element */

export default function Loading() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink text-paper"
      aria-busy="true"
    >
      {/* Visually hidden text for screen readers */}
      <span className="sr-only">Loading</span>

      <div className="flex flex-col items-center gap-2.5">
        {/* Wordmark */}
        <div className="flex items-start gap-1.5">
          <span className="text-[54px] font-extrabold leading-[0.9] tracking-[-0.045em]">
            Distill
          </span>
          <span className="mt-1.5 size-3 shrink-0 rounded-full bg-orange" />
        </div>

        {/* Animated underline bar — same keyframe the app wordmark uses */}
        <div className="w-[159px]">
          <span
            className="block h-1 rounded-full bg-orange"
            style={{ animation: "underline 1s ease-in-out infinite alternate" }}
          />
        </div>

        {/* "by Atheria" */}
        <div className="flex items-center gap-2 pt-1.5">
          <span className="text-xs text-grey-600">by</span>
          <img
            src="/atheria-wordmark.png"
            alt="Atheria"
            className="block h-4 w-auto opacity-75"
          />
        </div>
      </div>
    </main>
  );
}
