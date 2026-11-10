/**
 * The layout for the public text pages, Privacy and Terms (SPEC.md rule 1b, step 7). Readable
 * without signing in, because Google's sign in screen links to them. A plain column of headed
 * sections in the paper colour, with a way back to Sign in.
 */

import Link from "next/link";
import { DistillMark } from "./DistillMark";

/** One page: title, last updated date, then the sections given as children. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 bg-paper px-5 pb-12 pt-6 text-ink">
      <Link href="/login" aria-label="Distill, go to sign in" className="self-start no-underline"><DistillMark tone="paper" /></Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        <p className="text-[13px] text-grey-600">Last updated {updated}</p>
      </div>
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-grey-700 [&_a]:font-semibold [&_a]:text-orange-text [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
      <p className="mt-4 flex items-center gap-1 text-[13px] text-grey-600">
        {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Sign in", "/login"]].map(([label, href]) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center px-2 font-semibold text-grey-700">{label}</Link>
        ))}
      </p>
    </main>
  );
}
