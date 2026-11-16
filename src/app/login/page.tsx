/**
 * Screen 0, Sign in. Route: /login. Story US1, SPEC.md rule 1.
 * Shows what the app does — the Distill wordmark with animated bar, "by Atheria", a tagline,
 * an illustrative receipt graphic, three step pills, and the Google sign-in button.
 * `next` is the page to return to after sign in (for example an invite link); only addresses
 * inside the app are accepted. Links to Privacy and Terms (rule 1b).
 * This page is also the app home page given to Google.
 * Approved design: option D (canvas "Main.dc.html", 16 Nov 2026).
 */

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SignInButton } from "./SignInButton";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <main className="flex min-h-dvh flex-col bg-ink px-6 pb-6 text-paper">

      {/* Wordmark block: large Distill name, animated orange bar, "by Atheria" */}
      <div className="flex shrink-0 flex-col justify-center gap-2.5 pt-14">
        <div className="flex items-start gap-[7px]">
          <span className="text-[72px] font-extrabold leading-[0.9] tracking-[-0.045em]">Distill</span>
          <span className="mt-2 size-[15px] shrink-0 rounded-full bg-orange" />
        </div>
        <div className="w-[212px]">
          <span
            className="block h-[5px] rounded-full bg-orange"
            style={{ animation: "underline 1s ease-in-out infinite alternate" }}
          />
        </div>
        <div className="flex items-center gap-[9px] pt-1">
          <span className="text-[13px] text-sand">by</span>
          <img src="/atheria-wordmark.png" alt="Atheria" className="block h-[19px] w-auto opacity-75" />
        </div>
      </div>

      {/* Tagline */}
      <div className="mt-5 flex flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold leading-[1.12] tracking-[-0.02em]">
          Shared shopping, sorted.
        </h1>
        <p className="text-[15px] leading-[1.35] text-sand">
          The fair way to split grocery bills.
        </p>
      </div>

      {/* Illustration: a receipt shape with coloured bars beside it */}
      <div className="flex flex-1 items-end gap-[18px] py-6">
        <div
          className="flex w-[92px] shrink-0 flex-col gap-[7px] rounded-t-[10px] bg-dark-card px-3 pb-4 pt-3.5"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 88% 94%, 75% 100%, 62% 94%, 50% 100%, 37% 94%, 25% 100%, 12% 94%, 0 100%)" }}
          aria-hidden="true"
        >
          <span className="h-1.5 w-full rounded-full bg-grey-700" />
          <span className="h-1.5 w-[78%] rounded-full bg-grey-700" />
          <span className="h-1.5 w-[90%] rounded-full bg-grey-700" />
          <span className="h-1.5 w-[64%] rounded-full bg-grey-700" />
          <span className="h-1.5 w-[84%] rounded-full bg-grey-700" />
          <span className="mt-1 h-1.5 w-[46%] rounded-full bg-orange" />
        </div>

        <div className="flex flex-1 flex-col gap-[13px] pb-1.5" aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <span className="h-[15px] flex-1 rounded-full bg-orange" />
            <span className="size-[15px] shrink-0 rounded-full bg-orange" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-[15px] w-[62%] rounded-full bg-sand" />
            <span className="size-[15px] shrink-0 rounded-full bg-sand" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-[15px] w-[38%] rounded-full bg-grey-700" />
            <span className="size-[15px] shrink-0 rounded-full bg-grey-700" />
          </div>
        </div>
      </div>

      <p className="pb-4 text-[13px] leading-[1.4] text-sand">
        One bill. Everyone pays for what they actually share.
      </p>

      {/* Step pills */}
      <div className="flex flex-col items-start gap-2 pb-5">
        {["1 · Photograph it", "2 · Your rules split it", "3 · Settle on your date"].map((step) => (
          <span key={step} className="rounded-full border-[1.5px] border-dark-line px-3.5 py-2 text-xs font-bold">
            {step}
          </span>
        ))}
      </div>

      {/* Sign in and legal links */}
      {error && <p role="alert" className="mb-3 text-center text-sm font-semibold text-red">Sign in failed. Try again.</p>}
      <SignInButton next={safeNext} />
      <p className="mt-3 text-center text-[13px] text-sand">We only use your name and email.</p>
      <p className="mt-2 text-center text-[13px]">
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 font-bold text-sand no-underline hover:text-paper">Privacy</Link>
        <span className="text-grey-600">&middot;</span>
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 font-bold text-sand no-underline hover:text-paper">Terms</Link>
      </p>
    </main>
  );
}
