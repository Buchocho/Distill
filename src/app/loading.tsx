export default function Loading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink text-paper" aria-busy="true">
      <span className="flex items-start gap-1 text-5xl font-extrabold tracking-tight">Distill<span className="mt-1 size-3 rounded-full bg-orange" /></span>
      <span className="text-sand">Loading...</span>
    </main>
  );
}
