import Link from "next/link";

export type Tone = "dark" | "orange" | "white" | "paper";

const TEXT: Record<Tone, string> = { dark: "text-paper", orange: "text-ink", white: "text-ink", paper: "text-ink" };
const ACCENT: Record<Tone, string> = { dark: "bg-orange", orange: "bg-ink", white: "bg-orange", paper: "bg-orange" };

/** The Distill wordmark. With href it is the way back to Home, and its underline moves for a few seconds. */
export function DistillMark({ tone, href, size = "sm" }: { tone: Tone; href?: string; size?: "sm" | "lg" }) {
  const big = size === "lg";
  const content = (
    <>
      <span className={big ? "text-5xl font-extrabold tracking-tight" : "text-sm font-extrabold tracking-tight"}>Distill</span>
      <span className={`${ACCENT[tone]} rounded-full ${big ? "mb-8 size-2.5" : "mb-2 size-[5px]"}`} />
    </>
  );
  if (!href) return <span className={`inline-flex items-start gap-0.5 ${TEXT[tone]}`}>{content}</span>;
  return (
    <Link
      href={href}
      aria-label="Distill, go to Home"
      className={`relative inline-flex min-h-8 items-center gap-0.5 self-start no-underline ${TEXT[tone]}`}
    >
      {content}
      <span
        aria-hidden="true"
        className={`absolute bottom-1 left-0 h-0.5 w-full rounded ${ACCENT[tone]}`}
        style={{ animation: "underline 1s ease-in-out 4 alternate" }}
      />
    </Link>
  );
}
