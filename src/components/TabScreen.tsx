/**
 * The shared layout for the first screen of each tab: colour, Distill mark back to Home, label,
 * title, content and tab bar. New tab screens should use this rather than building their own.
 */

import { DistillMark } from "./DistillMark";
import { TabBar, type Tab } from "./TabBar";

const THEME: Record<Tab, { root: string; tone: "dark" | "orange" | "white"; label: string }> = {
  receipts: { root: "bg-dark text-paper", tone: "dark", label: "text-sand" },
  categories: { root: "bg-orange text-ink", tone: "orange", label: "text-ink" },
  balance: { root: "bg-white text-ink", tone: "white", label: "text-grey-600" },
};

/** The first screen of a tab: its Home colour, the Distill mark back to Home, a label and a title. */
export function TabScreen({ groupId, tab, label, title, action, children }: {
  groupId: string;
  tab: Tab;
  label: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = THEME[tab];
  return (
    <main className={`flex min-h-dvh flex-col ${t.root}`}>
      <header className="flex items-start gap-2 pb-2 pl-5 pr-3 pt-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <DistillMark tone={t.tone} href={`/groups/${groupId}`} />
          <span className={`text-xs font-bold tracking-[1.4px] ${t.label}`}>{label}</span>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
        </div>
        {action}
      </header>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-2">{children}</div>
      <TabBar groupId={groupId} active={tab} />
    </main>
  );
}
