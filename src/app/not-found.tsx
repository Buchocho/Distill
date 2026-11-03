import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-4 bg-paper px-5 text-ink">
      <h1 className="text-2xl font-extrabold">Not found</h1>
      <p className="text-grey-700">This page or group does not exist, or you are not a member of it.</p>
      <Link href="/" className="flex min-h-13 items-center justify-center rounded-xl bg-orange font-extrabold text-ink no-underline">Go to start</Link>
    </main>
  );
}
