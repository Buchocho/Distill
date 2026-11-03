import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export type Tab = "receipts" | "categories" | "balance";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "receipts", label: "Receipts", icon: "receipt" },
  { id: "categories", label: "Categories", icon: "tag" },
  { id: "balance", label: "Balance", icon: "scale" },
];

// Each tab keeps the colour of its Home section: receipts dark, categories orange, balance white.
const STYLE: Record<Tab, { bar: string; on: string; off: string; pill: string }> = {
  receipts: { bar: "bg-ink", on: "text-paper", off: "text-sand", pill: "bg-orange text-ink" },
  categories: { bar: "bg-orange border-t-[1.5px] border-ink", on: "text-ink", off: "text-ink", pill: "bg-ink text-orange" },
  balance: { bar: "bg-white border-t border-grey-100", on: "text-ink", off: "text-grey-600", pill: "bg-ink text-paper" },
};

export function TabBar({ groupId, active }: { groupId: string; active: Tab }) {
  const s = STYLE[active];
  return (
    <nav aria-label="Main" className={`sticky bottom-0 flex pb-3 ${s.bar}`}>
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/groups/${groupId}/${t.id}`}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-15 flex-1 flex-col items-center justify-center gap-1 text-xs no-underline ${
              on ? `${s.on} font-extrabold` : `${s.off} font-semibold`
            }`}
          >
            <span className={`grid h-7 w-10 place-items-center rounded-full ${on ? s.pill : ""}`}>
              <Icon name={t.icon} />
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
