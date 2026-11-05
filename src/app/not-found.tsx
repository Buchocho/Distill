/**
 * Shown for an address that does not exist, a bad invite link, or a group the user is not a member
 * of. The same message covers all three on purpose, so the app does not reveal which groups exist.
 */

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
