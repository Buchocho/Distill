"use client";

/**
 * The review form of screen 3: check and correct what was read, then save. Runs in the browser.
 * Layout follows mockup "Review receipt v3", approved by Maduabuchi on 9 Nov 2026.
 *
 * Only the person who scanned the receipt sees this form; they are its payer (SPEC.md rule 4).
 * What they can do (SPEC.md rules 6 to 9c, stories US2 and US5):
 * - correct the store, date, total, and each item's name and price (rule 8);
 * - give an item a category: one of the group's, one proposed by the reading, or a new name
 *   (rule 7); or choose "Leave unsorted" to sort it later (rule 9, US5);
 * - correct the receipt number, and see a warning when the date looks misread (rule 8);
 * - see when the receipt is already saved: blocked for the same store and receipt number,
 *   a warning for the same store, date and total (rule 9c);
 * - see each item's discount, for information only: the price shown is already what was paid (rule 6);
 * - see the sum check: whether the items add up to the printed total, and the difference (rule 8);
 * - see, when tax was already inside the item prices, that it is not added again (rule 6a);
 * - see which values the reading was unsure of, fill in prices it could not read, and use a
 *   suggested price worked out from the total when only one price is in doubt (rule 8a, approved
 *   design Review receipt v4, 10 Nov 2026);
 * - delete the receipt instead of saving it (rule 9b).
 * Save is never blocked by unsorted items, a sum difference or a value marked unsure; the person
 * decides. It is blocked while a price is empty, so no price is ever saved that nobody entered.
 * Amounts are typed and shown in the group's currency style (rule 2b).
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { currencyAffix, formatCents, formatMoney, parseAmount } from "@/domain/money";
import { findDuplicate, suggestPrice, sumCheck, type ReadingFlag } from "@/domain/receipts";
import { dateLooksWrong, deviceToday, longDate } from "@/domain/dates";
import { DeleteReceipt } from "./DeleteReceipt";

type Category = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  priceCents: number;
  discountCents: number | null;
  categoryId: string | null;
  proposedCategory: string | null;
  readingFlag: ReadingFlag;
};

type Saved = {
  id: string;
  storeName: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  receiptNumber: string | null;
  paidByName: string;
};

/**
 * One editable line. choice is "none" (not decided yet), "skip" (left unsorted on purpose),
 * "c:<category id>", "p:<new category name>", or NEW while a new name is being typed.
 * "none" and "skip" both save as no category; they only look different.
 */
interface Row {
  key: string;
  name: string;
  price: string;
  discountCents: number | null;
  choice: string;
  /** How sure the reading was of the price (rule 8a). */
  flag: ReadingFlag;
}

const NEW = "__new";
const SKIP = "skip";

/** Width of an amount field: just wide enough for what is typed, so the category dropdown keeps the room. */
const amountWidth = (text: string, min: number) => ({ width: `${Math.max(min, text.length) + 0.3}ch` });

/**
 * A dropdown with the app's own arrow, so it looks the same on every phone. attention: orange,
 * nothing chosen yet. muted: grey, left unsorted on purpose.
 */
function Picker({ id, label, value, onChange, attention, muted, children }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  attention: boolean;
  muted: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full appearance-none truncate rounded-xl pl-3.5 pr-9 text-[15px] ${attention
          ? "border-2 border-orange bg-dark font-bold text-orange"
          : muted ? "border-2 border-dashed border-dark-line bg-dark font-semibold text-sand"
          : "border-0 bg-dark-line font-semibold text-paper"}`}>
        {children}
      </select>
      <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${attention ? "text-orange" : muted ? "text-sand" : "text-paper"}`}>
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
  totalUnclear: boolean;
  dateUnclear: boolean;
  taxIncludedCents: number | null;
  items: Item[];
  categories: Category[];
  photoCount: number;
  receiptNumber: string | null;
  saved: Saved[];
}) {
  const router = useRouter();
  const { prefix, suffix } = currencyAffix(props.currency);
  const [store, setStore] = useState(props.storeName ?? "");
  const [date, setDate] = useState(props.purchaseDate ?? "");
  const [total, setTotal] = useState(props.totalCents === null ? "" : formatCents(props.totalCents, props.currency));
  const [number, setNumber] = useState(props.receiptNumber ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    props.items.map((i) => ({
      key: i.id,
      name: i.name,
      // A price the reading could not read starts empty: nothing is filled in for the person (rule 8a).
      price: i.readingFlag === "missing" ? "" : formatCents(i.priceCents, props.currency),
      discountCents: i.discountCents,
      flag: i.readingFlag,
      choice: i.categoryId ? `c:${i.categoryId}` : i.proposedCategory ? `p:${i.proposedCategory}` : "none",
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
  // Checked again on every change, so correcting the store or number updates the warning (rule 9c).
  const duplicate = findDuplicate({ storeName: store, purchaseDate: date || null, totalCents, receiptNumber: number || null }, props.saved);
  const blocked = duplicate?.kind === "block";
  const odd = date !== "" && dateLooksWrong(date, deviceToday());
  // Values the reading was unsure of stay marked until the person changes them (rule 8a).
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const dateDoubt = props.dateUnclear && !touched.date;
  const totalDoubt = props.totalUnclear && !touched.total;
  const anyDoubt = dateDoubt || totalDoubt || rows.some((r) => r.flag !== null && !touched[r.key]);
  const missingCount = prices.filter((p) => p === null).length;
  const suggestion = suggestPrice(prices, rows.map((r) => r.flag), totalCents);

  /** Changes one line of the form. */
  function update(key: string, change: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  /** Records that the person changed a value the reading was unsure of, so its mark goes. */
  function markChecked(key: string) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
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
        receiptNumber: number || null,
        purchaseDate: date || null,
        totalCents,
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
      {anyDoubt && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border-[1.5px] border-orange bg-orange/15 px-3.5 py-3">
          <span aria-hidden="true" className="grid size-[22px] shrink-0 place-items-center rounded-full bg-orange text-sm font-extrabold text-ink">!</span>
          <p className="text-sm leading-snug">
            <b>Some values were hard to read.</b> Check the ones marked against the receipt.
            {props.photoCount > 0 && (
              <> <a href={`/api/v1/receipts/${props.receiptId}/photos/1`} target="_blank" rel="noreferrer" className="font-bold text-orange underline">See photo</a></>
            )}
          </p>
        </div>
      )}
      {duplicate && (
        <div role="alert" className={`flex flex-col gap-1 rounded-2xl p-4 ${blocked ? "bg-red-tint text-red" : "bg-orange-tint text-orange-text"}`}>
          <p className="font-extrabold">{blocked ? "This receipt is already saved" : "This looks like a receipt already saved"}</p>
          <p className="text-sm font-semibold">
            {duplicate.match.storeName}
            {duplicate.match.purchaseDate ? `, ${longDate(duplicate.match.purchaseDate)}` : ""}
            {duplicate.match.totalCents !== null ? `, ${formatMoney(duplicate.match.totalCents, props.currency)}` : ""}
            , paid by {duplicate.match.paidByName}.
          </p>
          <p className="text-sm">{blocked ? "It has the same receipt number. Delete this one." : "Delete this one, or save it if it is a different shop."}</p>
        </div>
      )}

      <section aria-label="Receipt details" className="flex flex-col gap-1.5 rounded-2xl bg-dark-card px-4 pb-2.5 pt-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className={`text-[13px] font-semibold ${odd || dateDoubt ? "border-b-2 border-dotted border-orange font-bold text-orange" : "text-sand"}`}>{date ? longDate(date) : "Add the date"}</span>
            <input type="date" aria-label="Date on the receipt" value={date} onChange={(e) => { setDate(e.target.value); markChecked("date"); }}
              className="absolute inset-0 cursor-pointer opacity-0" />
          </div>
          {(odd || dateDoubt) && <span className="text-[13px] font-bold text-orange">Check the date</span>}
          <span className="flex-1" />
          <label className="flex items-center gap-1 text-xs text-sand">
            No.
            <input aria-label="Receipt number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} placeholder="none"
              className="w-28 rounded-md bg-transparent text-left text-xs text-sand placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand" />
          </label>
        </div>
        <div className="flex items-baseline gap-3">
          <input aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store name" maxLength={60}
            className="min-w-0 flex-1 rounded-md bg-transparent text-xl font-extrabold text-paper placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand" />
          <label className="flex shrink-0 items-baseline text-[26px] font-extrabold tabular-nums">
            <span className="sr-only">Printed total</span>
            {prefix}
            <input inputMode="decimal" value={total} onChange={(e) => { setTotal(e.target.value); markChecked("total"); }} placeholder="0,00"
              style={amountWidth(total, 4)}
              className={`rounded-md bg-transparent text-right text-paper placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand ${totalDoubt ? "outline outline-2 outline-orange" : ""}`} />
            {suffix && <span className="ml-1.5">{suffix}</span>}
          </label>
        </div>
        {errors.totalCents && <p className="text-right text-sm font-semibold text-orange">{errors.totalCents}</p>}
        {totalDoubt && <p className="text-right text-[13px] font-bold text-orange">Hard to read. Check the total.</p>}
        <div className="flex items-center gap-2 text-sm text-sand">
          <span>Paid by you</span>
          <span className="flex-1" />
          {props.photoCount > 0 && (
            <a href={`/api/v1/receipts/${props.receiptId}/photos/1`} target="_blank" rel="noreferrer"
              className="inline-flex min-h-9 items-center font-bold text-orange underline underline-offset-2">See photo</a>
          )}
        </div>
      </section>

      <ul aria-label="Items" className="rounded-2xl bg-dark-card px-4">
        {rows.map((r, i) => {
          const attention = r.choice === "none";
          const skipped = r.choice === SKIP;
          const empty = prices[i] === null;
          const doubt = r.flag !== null && !touched[r.key];
          return (
            <li key={r.key} className="flex flex-col gap-2 border-b border-dark-line py-3.5 last:border-0">
              <input aria-label={`Item ${i + 1} name`} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} maxLength={80}
                className="w-full rounded-md bg-transparent text-base font-bold text-paper focus:outline focus:outline-1 focus:outline-sand" />
              <div className="flex items-center gap-3">
                <Picker id={`cat-${r.key}`} label={`Category for ${r.name || `item ${i + 1}`}`} value={r.choice} attention={attention} muted={skipped}
                  onChange={(v) => update(r.key, { choice: v })}>
                  {attention && <option value="none">Choose a category</option>}
                  {props.categories.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}
                  {proposed.map((n) => <option key={n} value={`p:${n}`}>{n} (new)</option>)}
                  <option value={NEW}>New category...</option>
                  <option value={SKIP}>{skipped ? "Unsorted, sort later" : "Leave unsorted"}</option>
                </Picker>
                <label className="flex h-11 shrink-0 items-center justify-end text-[23px] font-extrabold tabular-nums">
                  <span className="sr-only">Price of {r.name || `item ${i + 1}`}</span>
                  {prefix}
                  <input inputMode="decimal" value={r.price} onChange={(e) => { update(r.key, { price: e.target.value }); markChecked(r.key); }}
                    style={amountWidth(r.price, empty ? 6 : 4)} placeholder="____"
                    className={`rounded-md bg-transparent text-right text-paper placeholder:text-grey-400 focus:outline focus:outline-1 focus:outline-sand ${doubt || empty ? "outline outline-2 outline-orange" : ""}`} />
                  {suffix && <span className="ml-1.5">{suffix}</span>}
                </label>
              </div>
              {(empty || doubt) && (
                <span className="self-end text-[13px] font-bold text-orange">
                  {empty ? "Could not read this price. Enter it from the receipt." : "Hard to read. Check this price."}
                </span>
              )}
              {suggestion?.index === i && (
                <div className="flex items-center gap-2.5 rounded-xl bg-dark px-3 py-2.5">
                  <span className="flex-1 text-[13px] leading-snug text-sand">
                    Should this be <b className="text-paper">{formatMoney(suggestion.cents, props.currency)}</b>? That makes the items match the total.
                  </span>
                  <button type="button" onClick={() => { update(r.key, { price: formatCents(suggestion.cents, props.currency) }); markChecked(r.key); }}
                    className="min-h-11 shrink-0 rounded-lg bg-orange px-3 text-sm font-extrabold text-ink">
                    Use {formatMoney(suggestion.cents, props.currency)}
                  </button>
                </div>
              )}
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
              {errors[`item.${i}`] && <p className="text-sm font-semibold text-orange">{errors[`item.${i}`]}</p>}
            </li>
          );
        })}
      </ul>
      {props.taxIncludedCents !== null && (
        <p className="mx-1 text-[13px] text-sand">
          Tax of {formatMoney(props.taxIncludedCents, props.currency)} is already in these prices, so it is not added again.
        </p>
      )}
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
              {check.differenceCents > 0 ? "more" : "less"} than the total.{" "}
              {missingCount > 0 ? `${missingCount === 1 ? "One price is" : `${missingCount} prices are`} missing.` : "Check the prices."}
            </span>
          )}
        </div>
        {errors.form && <p role="alert" className="px-1 text-sm font-semibold text-orange">{errors.form}{errors.items ? ` ${errors.items}` : ""}</p>}
        <div className="flex flex-wrap gap-2.5">
          <DeleteReceipt receiptId={props.receiptId} groupId={props.groupId} compact />
          <button type="button" onClick={() => void save()} disabled={saving || blocked || missingCount > 0}
            className="min-h-13 flex-1 rounded-xl bg-orange text-base font-extrabold text-ink disabled:opacity-40">
            {saving ? "Saving..." : duplicate?.kind === "warn" ? "Save anyway" : "Save receipt"}
          </button>
        </div>
        {missingCount > 0 && <p className="text-center text-[13px] text-sand">Enter the missing price{missingCount === 1 ? "" : "s"} to save.</p>}
      </div>
    </>
  );
}
