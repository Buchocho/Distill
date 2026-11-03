import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/server/session";
import { NewGroupForm } from "./NewGroupForm";

export default async function NewGroup() {
  await requireUser("/groups/new");
  return (
    <main className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href="/" aria-label="Back" className="grid size-11 place-items-center rounded-xl text-ink"><Icon name="back" size={22} /></Link>
        <h1 className="text-xl font-extrabold">New group</h1>
      </header>
      <NewGroupForm />
    </main>
  );
}
