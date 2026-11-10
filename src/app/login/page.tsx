/**
 * Screen 0, Sign in. Route: /login. Story US1, SPEC.md rule 1.
 * Shows what the app does in three lines and the Google sign in button. `next` is the page to
 * return to after sign in (for example an invite link); only addresses inside the app are accepted.
 * Links to Privacy and Terms (rule 1b). This page is also the app home page given to Google.
 */

import Link from "next/link";
import { DistillMark } from "@/components/DistillMark";
import { SignInButton } from "./SignInButton";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-6 pb-10">
      <div className="flex flex-1 flex-col justify-center gap-3">
        <DistillMark tone="paper" size="lg" />
        <p className="text-xl font-semibold leading-snug">
          Shared shopping, sorted.
          <br />
          The fair way to split grocery bills.
        </p>
        <ol className="mt-5 flex flex-col gap-3.5 text-[15px] text-grey-700">
          {["Take a photo of the receipt", "Each item follows a rule you set once", "Settle up on a date your group picks"].map(
            (line, i) => (
              <li key={line} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-tint text-[13px] font-bold text-ink">{i + 1}</span>
                {line}
              </li>
            ),
          )}
        </ol>
      </div>
      {error && <p role="alert" className="mb-3 text-center text-sm font-semibold text-red">Sign in failed. Try again.</p>}
      <SignInButton next={safeNext} />
      <p className="mt-3 text-center text-[13px] text-grey-600">We only use your name and email.</p>
      <p className="mt-2 text-center text-[13px] text-grey-600">
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 font-semibold text-grey-700">Privacy</Link>
        ·
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 font-semibold text-grey-700">Terms</Link>
      </p>
    </main>
  );
}
