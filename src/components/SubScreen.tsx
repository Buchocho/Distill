/**
 * The layout for a screen one level inside a tab: a Back link, a title, and the content, in the
 * tab's colour (approved design: each journey keeps its tab's colour). New inner screens should use
 * this rather than building their own header.
 */

import Link from "next/link";
import { Icon } from "./Icon";
import { TabBar, type Tab } from "./TabBar";

const THEME: Record<Tab, string> = {
  receipts: "bg-dark text-paper",
  categories: "bg-orange text-ink",
  balance: "bg-white text-ink",
};

/** An inner screen: back to `backHref`, a title, then the content and the tab bar. */
export function SubScreen({ groupId, tab, backHref, backLabel, title, children }: {
  groupId: string;
  tab: Tab;
  backHref: string;
  backLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className={`flex min-h-dvh flex-col ${THEME[tab]}`}>
      <header className="flex items-center gap-2 px-3 pb-1 pt-3">
        <Link href={backHref} aria-label={backLabel} className="grid size-11 place-items-center rounded-xl text-current">
          <Icon name="back" size={22} />
        </Link>
        <h1 className="flex-1 text-xl font-extrabold">{title}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1">{children}</div>
      <TabBar groupId={groupId} active={tab} />
    </main>
  );
}
