"use client";

/**
 * The review form of screen 3: check and correct what was read, then save. Runs in the browser.
 *
 * What the person can do (SPEC.md rules 4 and 6 to 9, stories US2 and US5):
 * - correct the store, date, total, who paid, and each item's name and price (rule 8);
 * - give an item a category: one of the group's, one proposed by the reading, or a new name
 *   (rule 7); or leave it with no category with "Skip for now" (rule 9, US5);
 * - see the sum check: whether the items add up to the printed total, and the difference (rule 8).
 * Save is never blocked by unsorted items or by a sum difference; the person decides.
 * Amounts are typed and shown in the group's currency style (rule 2b).
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatCents, formatMoney, parseAmount } from "@/domain/money";
import { sumCheck } from "@/domain/receipts";

type Category = { id: string; name: string };
type Member = { id: string; name: string };
type Item = { id: string; name: string; priceCents: number; categoryId: string | null; proposedCategory: string | null };

/** One editable line. choice is "none", "c:<category id>" or "p:<new category name>". */
interface Row {
  key: string;
  name: string;
  price: string;
  choice: string;
  open: boolean;
  skipped: boolean;
}

const NEW = "__new";
const input = "w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-1 text-paper focus:border-sand focus:outline-none";

export function ReviewForm(props: {
  receiptId: string;
  groupId: string;
  currency: string;
  storeName: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  paidBy: string;
  me: string;
  items: Item[];
  categories: Category[];
  members: Member[];
  photoLinks: (string | null)[];
}) {
  const router = useRouter();
  const [store, setStore] = useState(props.storeName ?? "");
  const [date, setDate] = useState(props.purchaseDate ?? "");
  const [total, setTotal] = useState(props.totalCents === null ? "" : formatCents(props.totalCents, props.currency));
  const [paidBy, setPaidBy] = useState(props.paidBy);
  const [rows, setRows] = useState<Row[]>(() =>
    props.items.map((i) => ({
      key: i.id,
      name: i.name,
      price: formatCents(i.priceCents, props.currency),
      choice: i.categoryId ? `c:${i.categoryId}` : i.proposedCategory ? `p:${i.proposedCategory}` : "none",
      open: false,
      skipped: false,
    })),
  );
  const [newName, setNewName] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // New category names on this receipt, so a name proposed for one item can be picked for another (rule 7).
  const proposed = useMemo(
    () => [...new Set(rows.filter((r) => r.choice.startsWith("p:")).map((r) => r.choice.slice(2)))],
    [rows],
  );
  const prices = rows.map((r) => parseAmount(r.price));
  const totalCents = total.trim() ? parseAmount(total) : null;
  const check = sumCheck(prices.filter((p): p is number => p !== null), totalCents);
  const unsorted = rows.filter((r) => r.choice === "none").length;

  /** Changes one line of the form. */
  function update(key: string, change: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  // Sends the reviewed receipt to the API. Field errors come back per line and are shown under it.
  async function save() {
    const local: Record<string, string> = {};
    if (total.trim() && totalCents === null) local.totalCents = "Check the total.";
    prices.forEach((p, i) => {
      if (p === null) local[`item.${i}`] = "Check the price.";
    });
    if (Object.keys(local).length > 0) return setErrors(local);
    setSaving(true);
    setErrors({});
    const res = await fetch(`/api/v1/receipts/${props.receiptId}/save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storeName: store,
        purchaseDate: date || null,
        totalCents,
        paidBy,
        items: rows.map((r, i) => ({
          name: r.name,
          priceCents: prices[i],
          categoryId: r.choice.startsWith("c:") ? r.choice.slice(2) : null,
          proposedCategory: r.choice.startsWith("p:") ? r.choice.slice(2) : null,
        })),
      }),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> }) : {};
    if (!res || !res.ok) {
      setSaving(false);
      setErrors({ ...(body.fields ?? {}), form: body.error ?? "Could not save. Check your connection and try again." });
      return;
    }
    router.push(`/groups/${props.groupId}/receipts`);
    router.refresh();
  }

  // The return draws the header card, the item list, the sum check and the Save button (design Review2).
  return (
    <>
      <div className="flex flex-col gap-1 rounded-2xl bg-dark-card px-4 py-3.5">
        <div className="flex items-baseline gap-2">
          <input aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store"
            className={`${input} flex-1 text-[17px] font-extrabold`} maxLength={60} />
          <input aria-label="Printed total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Total"
            className={`${input} w-28 text-right text-[22px] font-extrabold tabular-nums`} />
        </div>
        {errors.totalCents && <p className="text-right text-sm font-semibold text-orange">{errors.totalCents}</p>}
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-sand">
          <input type="date" aria-label="Date on the receipt" value={date} onChange={(e) => setDate(e.target.value)}
            className={`${input} w-auto text-[13px] text-sand [color-scheme:dark]`} />
          <span>·</span>
          <label htmlFor="reviewPaidBy">Paid by</label>
          <select id="reviewPaidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
            className="min-h-8 rounded-md bg-dark px-1 font-bold text-paper">
            {props.members.map((m) => (
              <option key={m.id} value={m.id}>{m.id === props.me ? `${m.name.split(" ")[0]} (you)` : m.name.split(" ")[0]}</option>
            ))}
          </select>
          <span className="flex-1" />
          {props.photoLinks[0] && (
            <a href={props.photoLinks[0]} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center font-bold text-orange">See photo</a>
          )}
        </div>
      </div>

      <ul className="rounded-2xl bg-dark-card px-4">
        {rows.map((r, i) => {
          const unsortedRow = r.choice === "none";
          return (
            <li key={r.key} className="flex flex-col gap-1 border-b border-dark-line py-2.5 last:border-0">
              <div className="flex items-center gap-2">
                <input aria-label={`Item ${i + 1} name`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })}
                  className={`${input} flex-1 text-[15px] font-bold`} maxLength={80} />
                <input aria-label={`Item ${i + 1} price`} inputMode="decimal" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })}
                  className={`${input} w-24 text-right text-[15px] font-bold tabular-nums`} />
              </div>
              {unsortedRow && !r.open ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-bold ${r.skipped ? "bg-dark-line text-paper" : "bg-orange text-ink"}`}>
                    {r.skipped ? "Sort later" : "No category"}
                  </span>
                  <span className="flex-1" />
                  <button type="button" onClick={() => update(r.key, { open: true })}
                    className="min-h-9 rounded-[10px] border-[1.5px] border-paper px-3 text-sm font-bold text-paper">Choose</button>
                  {!r.skipped && (
                    <button type="button" onClick={() => update(r.key, { skipped: true })}
                      className="min-h-9 px-2 text-sm font-bold text-orange underline">Skip for now</button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label htmlFor={`cat-${r.key}`} className="sr-only">Category for item {i + 1}</label>
                  <select id={`cat-${r.key}`} value={r.choice}
                    onChange={(e) => update(r.key, { choice: e.target.value, open: e.target.value === NEW || e.target.value === "none" })}
                    className="min-h-9 max-w-full rounded-md bg-dark px-1 text-[13px] text-sand">
                    <option value="none">No category (skip for now)</option>
                    {props.categories.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}
                    {proposed.map((n) => <option key={n} value={`p:${n}`}>{n} (new)</option>)}
                    <option value={NEW}>New category...</option>
                  </select>
                </div>
              )}
              {r.choice === NEW && (
                <div className="flex items-center gap-2">
                  <input aria-label={`New category for item ${i + 1}`} value={newName[r.key] ?? ""} maxLength={40} placeholder="For example, Oat milk"
                    onChange={(e) => setNewName((n) => ({ ...n, [r.key]: e.target.value }))}
                    className="min-h-9 flex-1 rounded-md border border-dark-line bg-dark px-2 text-sm text-paper" />
                  <button type="button" disabled={!(newName[r.key] ?? "").trim()}
                    onClick={() => {
                      const name = (newName[r.key] ?? "").trim().replace(/\s+/g, " ");
                      const existing = props.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
                      update(r.key, { choice: existing ? `c:${existing.id}` : `p:${name}`, open: false });
                    }}
                    className="min-h-9 rounded-[10px] bg-orange px-3 text-sm font-bold text-ink disabled:opacity-50">Add</button>
                </div>
              )}
              {errors[`item.${i}`] && <p className="text-sm font-semibold text-orange">{errors[`item.${i}`]}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2.5 pb-3 pt-1">
        <div className="flex items-center gap-2 px-1 text-sm font-bold" aria-live="polite">
          {check.differenceCents === 0 ? (
            <>
              <span className="grid size-[22px] place-items-center rounded-full bg-green text-paper"><Icon name="check" size={14} strokeWidth={3} /></span>
              Items add up to {formatMoney(check.itemsCents, props.currency)}
            </>
          ) : check.differenceCents === null ? (
            <span className="text-sand">Items come to {formatMoney(check.itemsCents, props.currency)}. Add the printed total to check it.</span>
          ) : (
            <span className="text-orange">
              Items come to {formatMoney(check.itemsCents, props.currency)}, {formatMoney(Math.abs(check.differenceCents), props.currency)}{" "}
              {check.differenceCents > 0 ? "more" : "less"} than the total. Check the prices.
            </span>
          )}
        </div>
        {unsorted > 0 && <p className="px-1 text-[13px] text-sand">{unsorted} item{unsorted === 1 ? "" : "s"} without a category. You can sort {unsorted === 1 ? "it" : "them"} later.</p>}
        {errors.form && <p role="alert" className="px-1 text-sm font-semibold text-orange">{errors.form}{errors.items ? ` ${errors.items}` : ""}</p>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="min-h-13 rounded-xl bg-orange text-base font-extrabold text-ink disabled:opacity-60">
          {saving ? "Saving..." : "Save receipt"}
        </button>
      </div>
    </>
  );
}
