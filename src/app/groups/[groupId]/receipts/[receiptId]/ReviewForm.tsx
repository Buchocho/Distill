"use client";

/**
 * The review form of screen 3: check and correct what was read, then save. Runs in the browser.
 * Layout follows mockup "Review receipt v3", approved by Maduabuchi on 9 Nov 2026.
 *
 * What the person can do (SPEC.md rules 4 and 6 to 9b, stories US2 and US5):
 * - correct the store, date, total, who paid, and each item's name and price (rule 8);
 * - give an item a category: one of the group's, one proposed by the reading, or a new name
 *   (rule 7); or leave it with "Skip for now" (rule 9, US5);
 * - see each item's discount, for information only: the price shown is already what was paid (rule 6);
 * - see the sum check: whether the items add up to the printed total, and the difference (rule 8);
 * - delete the receipt instead of saving it (rule 9b).
 * Save is never blocked by unsorted items or by a sum difference; the person decides.
 * Amounts are typed and shown in the group's currency style (rule 2b).
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { currencyAffix, formatCents, formatMoney, parseAmount } from "@/domain/money";
import { sumCheck } from "@/domain/receipts";
import { DeleteReceipt } from "./DeleteReceipt";

type Category = { id: string; name: string };
type Member = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  priceCents: number;
  discountCents: number | null;
  categoryId: string | null;
  proposedCategory: string | null;
};

/** One editable line. choice is "none", "c:<category id>", "p:<new category name>" or NEW while typing one. */
interface Row {
  key: string;
  name: string;
  price: string;
  discountCents: number | null;
  choice: string;
  skipped: boolean;
}

const NEW = "__new";

/** "28 Sep 2026" from YYYY-MM-DD, the date style used across the app. Built by hand so every phone shows the same. */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

/** Width of an amount field: just wide enough for what is typed, so the category dropdown keeps the room. */
const amountWidth = (text: string, min: number) => ({ width: `${Math.max(min, text.length) + 0.3}ch` });

/** A dropdown with the app's own arrow, so it looks the same on every phone. */
function Picker({ id, label, value, onChange, attention, children }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  attention: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full appearance-none truncate rounded-xl pl-3.5 pr-9 text-[15px] ${attention
          ? "border-2 border-orange bg-dark font-bold text-orange"
          : "border-0 bg-dark-line font-semibold text-paper"}`}>
        {children}
      </select>
      <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${attention ? "text-orange" : "text-paper"}`}>
        <Icon name="chevron" size={14} strokeWidth={2.5} />
      </span>
    </div>
  );
}

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
  photoCount: number;
}) {
  const router = useRouter();
  const { prefix, suffix } = currencyAffix(props.currency);
  const [store, setStore] = useState(props.storeName ?? "");
  const [date, setDate] = useState(props.purchaseDate ?? "");
  const [total, setTotal] = useState(props.totalCents === null ? "" : formatCents(props.totalCents, props.currency));
  const [paidBy, setPaidBy] = useState(props.paidBy);
  const [rows, setRows] = useState<Row[]>(() =>
    props.items.map((i) => ({
      key: i.id,
      name: i.name,
      price: formatCents(i.priceCents, props.currency),
      discountCents: i.discountCents,
      choice: i.categoryId ? `c:${i.categoryId}` : i.proposedCategory ? `p:${i.proposedCategory}` : "none",
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
          discountCents: r.discountCents,
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

  // The return draws the details card (date, store and total, paid by, photo), the items, the sum
  // check, and Delete and Save (mockup Review receipt v3).
  return (
    <>
      <section aria-label="Receipt details" className="flex flex-col gap-1.5 rounded-2xl bg-dark-card px-4 pb-2.5 pt-3">
        <div className="relative self-start">
          <span className="text-[13px] font-semibold text-sand">{date ? longDate(date) : "Add the date"}</span>
          <input type="date" aria-label="Date on the receipt" value={date} onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0" />
        </div>
        <div className="flex items-baseline gap-3">
          <input aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store name" maxLength={60}
            className="min-w-0 flex-1 rounded-md bg-transparent text-xl font-extrabold text-paper placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand" />
          <label className="flex shrink-0 items-baseline text-[26px] font-extrabold tabular-nums">
            <span className="sr-only">Printed total</span>
            {prefix}
            <input inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0,00"
              style={amountWidth(total, 4)}
              className="rounded-md bg-transparent text-right text-paper placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand" />
            {suffix && <span className="ml-1.5">{suffix}</span>}
          </label>
        </div>
        {errors.totalCents && <p className="text-right text-sm font-semibold text-orange">{errors.totalCents}</p>}
        <div className="flex items-center gap-2 text-sm text-sand">
          <label htmlFor="reviewPaidBy">Paid by</label>
          <div className="relative">
            <select id="reviewPaidBy" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
              className="min-h-9 appearance-none rounded-[10px] bg-dark-line pl-2.5 pr-8 text-sm font-bold text-paper">
              {props.members.map((m) => (
                <option key={m.id} value={m.id}>{m.id === props.me ? `${m.name} (you)` : m.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper"><Icon name="chevron" size={14} strokeWidth={2.5} /></span>
          </div>
          <span className="flex-1" />
          {props.photoCount > 0 && (
            <a href={`/api/v1/receipts/${props.receiptId}/photos/1`} target="_blank" rel="noreferrer"
              className="inline-flex min-h-9 items-center font-bold text-orange">See photo</a>
          )}
        </div>
      </section>

      <ul aria-label="Items" className="rounded-2xl bg-dark-card px-4">
        {rows.map((r, i) => {
          const attention = r.choice === "none" && !r.skipped;
          return (
            <li key={r.key} className="flex flex-col gap-2 border-b border-dark-line py-3.5 last:border-0">
              <input aria-label={`Item ${i + 1} name`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} maxLength={80}
                className="w-full rounded-md bg-transparent text-base font-bold text-paper focus:outline focus:outline-1 focus:outline-sand" />
              <div className="flex items-center gap-3">
                <Picker id={`cat-${r.key}`} label={`Category for ${r.name || `item ${i + 1}`}`} value={r.choice} attention={attention}
                  onChange={(v) => update(r.key, { choice: v, skipped: false })}>
                  <option value="none">{r.skipped ? "No category (sort later)" : "Choose a category"}</option>
                  {props.categories.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}
                  {proposed.map((n) => <option key={n} value={`p:${n}`}>{n} (new)</option>)}
                  <option value={NEW}>New category...</option>
                </Picker>
                <label className="flex h-11 shrink-0 items-center justify-end text-[23px] font-extrabold tabular-nums">
                  <span className="sr-only">Price of {r.name || `item ${i + 1}`}</span>
                  {prefix}
                  <input inputMode="decimal" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })}
                    style={amountWidth(r.price, 4)}
                    className="rounded-md bg-transparent text-right text-paper focus:outline focus:outline-1 focus:outline-sand" />
                  {suffix && <span className="ml-1.5">{suffix}</span>}
                </label>
              </div>
              {r.discountCents !== null && (
                <span className="self-end text-[13px] font-semibold text-sand">
                  Discount {formatMoney(r.discountCents, props.currency)} (already in the price)
                </span>
              )}
              {r.choice === NEW && (
                <div className="flex items-center gap-2">
                  <input aria-label={`New category for ${r.name || `item ${i + 1}`}`} value={newName[r.key] ?? ""} maxLength={40} placeholder="For example, Orange juice"
                    onChange={(e) => setNewName((n) => ({ ...n, [r.key]: e.target.value }))}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-dark-line bg-dark px-3 text-[15px] text-paper" />
                  <button type="button" disabled={!(newName[r.key] ?? "").trim()}
                    onClick={() => {
                      const name = (newName[r.key] ?? "").trim().replace(/\s+/g, " ");
                      const existing = props.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
                      update(r.key, { choice: existing ? `c:${existing.id}` : `p:${name}` });
                    }}
                    className="min-h-11 rounded-xl bg-orange px-4 font-bold text-ink disabled:opacity-50">Add</button>
                </div>
              )}
              {attention && (
                <button type="button" onClick={() => update(r.key, { skipped: true })}
                  className="min-h-9 self-start text-sm font-bold text-orange underline">Skip for now</button>
              )}
              {errors[`item.${i}`] && <p className="text-sm font-semibold text-orange">{errors[`item.${i}`]}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mx-1 text-[13px] text-sand">Tap a name or price to correct it.</p>

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
        {errors.form && <p role="alert" className="px-1 text-sm font-semibold text-orange">{errors.form}{errors.items ? ` ${errors.items}` : ""}</p>}
        <div className="flex flex-wrap gap-2.5">
          <DeleteReceipt receiptId={props.receiptId} groupId={props.groupId} compact />
          <button type="button" onClick={() => void save()} disabled={saving}
            className="min-h-13 flex-1 rounded-xl bg-orange text-base font-extrabold text-ink disabled:opacity-60">
            {saving ? "Saving..." : "Save receipt"}
          </button>
        </div>
      </div>
    </>
  );
}
