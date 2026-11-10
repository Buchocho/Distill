/**
 * Receipt rules: what a reading must contain, the sum check, and matching items to categories.
 *
 * What it holds: the check on Gemini's answer (parseReading), the "items add up to the total"
 * check shown on the review screen (sumCheck), how a category name from the reading is matched
 * to the group's list (matchCategory), and the check on a receipt before it is saved
 * (validateReview), and duplicate checking (receiptNumberKey, findDuplicate).
 *
 * Why it matters: the reading step is the part of Distill most likely to be wrong. Gemini's answer
 * is never trusted as it comes: anything malformed is dropped or refused here, prices become whole
 * cents, and the person reviewing sees whether the items match the printed total before saving.
 *
 * Business rules: SPEC.md rules 6 (store, date, total, receipt number, items; an item's price is what was paid
 * after its discount, and the discount is kept for information only; tax lines are items),
 * 7 (category, at product type level, from the group's list or a proposed new one), 8 (sum check, edits before
 * saving), 9 (unsorted items never block saving) and 9c (duplicates). Stories US2 and US5.
 * Pure functions. Tests: tests/unit/receipts.test.ts, with sample readings in tests/fixtures.
 */

import { parseAmount } from "./money";

/** Longest item name kept. Receipt lines are short; anything longer is cut, not refused. */
export const ITEM_NAME_MAX = 80;
/** Longest category name. Fits on one line of the review screen at 375 px. */
export const CATEGORY_NAME_MAX = 40;
/** Most items on one receipt. A guard against a broken reading, far above a real shop. */
export const MAX_ITEMS = 300;

/**
 * One line as read from the receipt: name, the price paid in cents, the discount on that item in
 * cents (information only, null if none) and a category name, if any. A price is negative only for
 * a discount on the whole receipt, such as a voucher, which stays its own line until version 2.
 */
export interface ReadItem {
  name: string;
  /** 0 when the price could not be read (flag "missing"). */
  priceCents: number;
  discountCents: number | null;
  category: string | null;
  /** How sure the reading was of the price (rule 8a): null clear, "unclear", or "missing". */
  flag: ReadingFlag;
}

/** How sure a reading was of a price (SPEC.md rule 8a, added 10 Nov 2026). */
export type ReadingFlag = "unclear" | "missing" | null;

/** What the reading step returns (SPEC.md rule 6). Any field it could not read is null. */
export interface Reading {
  storeName: string | null;
  receiptNumber: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  items: ReadItem[];
  /** The reading was unsure of the printed total or the date (rule 8a). */
  totalUnclear: boolean;
  dateUnclear: boolean;
  /** Tax already inside the item prices, shown for information and never added again (rule 6a); null otherwise. */
  taxIncludedCents: number | null;
}

/** Text from the reading, trimmed and cut to a length, or null when empty or not text. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim().replace(/\s+/g, " ");
  return t.length === 0 ? null : t.slice(0, max);
}

/** An amount from the reading as cents. Gemini is asked for text such as "12.90", but numbers are accepted too. */
function cleanAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return parseAmount(value.toFixed(2));
  if (typeof value === "string") return parseAmount(value);
  return null;
}

/** True when the text is a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Checks Gemini's answer and turns it into a Reading (SPEC.md rule 6).
 *
 * Lenient on single lines, strict on the whole: a line without a name is dropped, because one bad
 * line should not lose the receipt. A named line whose price could not be read is kept with an
 * empty price, flagged "missing", for the person to fill in; a price the reading was unsure of is
 * flagged "unclear" (rule 8a, so no number is ever made up). An answer with no usable lines at
 * all throws, and the receipt is then marked "failed" so the user can retry (rule 10).
 * A date that is not a real date is dropped rather than guessed.
 */
export function parseReading(raw: unknown): Reading {
  if (typeof raw !== "object" || raw === null) throw new Error("Reading is not an object");
  const r = raw as Record<string, unknown>;
  const list = Array.isArray(r.items) ? r.items : [];
  const items: ReadItem[] = [];
  for (const entry of list.slice(0, MAX_ITEMS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const name = cleanText(e.name, ITEM_NAME_MAX);
    if (!name) continue;
    const priceCents = cleanAmount(e.price);
    const flag: ReadingFlag = priceCents === null ? "missing" : e.price_unclear === true ? "unclear" : null;
    // A discount is stored as a positive amount whichever way it was written; zero means none.
    const discount = cleanAmount(e.discount);
    const discountCents = discount === null || discount === 0 ? null : Math.abs(discount);
    items.push({ name, priceCents: priceCents ?? 0, discountCents, category: cleanText(e.category, CATEGORY_NAME_MAX), flag });
  }
  // No line with a readable price at all: the reading is no use, so the receipt can be retried.
  if (items.every((i) => i.flag === "missing")) throw new Error("Reading has no items");
  const date = cleanText(r.date, 10);
  return {
    storeName: cleanText(r.store, 60),
    receiptNumber: cleanText(r.receipt_number, 60),
    purchaseDate: date && isIsoDate(date) ? date : null,
    totalCents: cleanAmount(r.total),
    totalUnclear: r.total_unclear === true,
    dateUnclear: r.date_unclear === true,
    // Tax already in the prices is not an item (rule 6a).
    ...reconcileTax(items, cleanAmount(r.total), cleanAmount(r.subtotal), cleanAmount(r.tax_total), r.tax_included === true),
  };
}

/** True for a line that is tax, by its category or its name. */
export function isTaxLine(item: { name: string; category: string | null }): boolean {
  const t = (s: string | null) => (s ?? "").trim().toLowerCase();
  return t(item.category) === "tax" || /^(tax|vat|iva|gst|sales tax|cons(umption)? ?tax)\b/.test(t(item.name));
}

/**
 * Works out whether the receipt's tax is added on top or already inside the item prices
 * (SPEC.md rule 6a, found by a beta tester on 10 Nov 2026: a Nigerian receipt printed
 * "Bill Amount 8,888.89, Tax 1,111.11, Payable 10,000.00" while the item prices already came to
 * 10,000.00). Counting the tax as an item then charges it twice. The receipt's own sums decide:
 * - the items without the tax lines already make the total: tax is inside the prices;
 * - the items plus the tax lines make the total: tax is added on top, keep the tax lines;
 * - otherwise (a price unreadable or misread), follow the subtotal: if subtotal plus tax makes the
 *   total and the items without tax make the subtotal, tax is on top; if not, the reading's own
 *   answer (tax_included) decides.
 * When the tax is inside the prices, the tax lines are removed and the amount kept for
 * information. Returns the items to keep and that amount.
 */
export function reconcileTax(
  items: ReadItem[],
  totalCents: number | null,
  subtotalCents: number | null,
  taxTotalCents: number | null,
  readSaysIncluded: boolean,
): { items: ReadItem[]; taxIncludedCents: number | null } {
  const taxLines = items.filter(isTaxLine);
  const others = items.filter((i) => !isTaxLine(i));
  const sum = (list: ReadItem[]) => list.reduce((n, i) => n + i.priceCents, 0);
  const taxCents = taxLines.length > 0 ? sum(taxLines) : taxTotalCents;
  const allClear = others.every((i) => i.flag === null);
  let included: boolean;
  if (totalCents !== null && allClear && sum(others) === totalCents) included = true;
  else if (totalCents !== null && allClear && taxLines.length > 0 && sum(others) + sum(taxLines) === totalCents) included = false;
  else if (allClear && subtotalCents !== null && sum(others) === subtotalCents) included = false;
  else included = readSaysIncluded;
  if (!included || !taxCents) return { items, taxIncludedCents: null };
  return { items: others.length > 0 ? others : items, taxIncludedCents: taxCents };
}

/**
 * A suggested price for the one doubtful line (SPEC.md rule 8a): when exactly one price is
 * missing, or none is missing and exactly one is unclear, and the printed total is known, the
 * receipt's own numbers give it: the total minus every other price. Only offered when the result is
 * above zero. It is a suggestion the person can use, never filled in on its own.
 * prices: each line's price in cents, null when empty or not readable.
 */
export function suggestPrice(
  prices: readonly (number | null)[],
  flags: readonly ReadingFlag[],
  totalCents: number | null,
): { index: number; cents: number } | null {
  if (totalCents === null) return null;
  // Empty now counts as missing; a line that was missing but has since been typed in counts as unclear.
  const missing = prices.map((p, i) => (p === null ? i : -1)).filter((i) => i >= 0);
  const unclear = flags.map((f, i) => (f !== null && prices[i] !== null ? i : -1)).filter((i) => i >= 0);
  const index = missing.length === 1 ? missing[0] : missing.length === 0 && unclear.length === 1 ? unclear[0] : -1;
  if (index < 0) return null;
  const others = prices.reduce<number>((n, p, i) => (i === index ? n : n + (p ?? 0)), 0);
  const cents = totalCents - others;
  return cents > 0 && cents !== prices[index] ? { index, cents } : null;
}

/**
 * The sum check on the review screen (SPEC.md rule 8): the items added up, and how far that is
 * from the printed total. differenceCents is items minus total, so a positive number means the
 * items come to more than the receipt says. Null when the total could not be read.
 */
export function sumCheck(itemPricesCents: readonly number[], totalCents: number | null) {
  const itemsCents = itemPricesCents.reduce((a, b) => a + b, 0);
  return { itemsCents, differenceCents: totalCents === null ? null : itemsCents - totalCents };
}

/** Category names are matched ignoring capitals and extra spaces, the same as the database rule (SPEC.md rule 7). */
export function categoryKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Matches a category name from the reading to the group's list (SPEC.md rule 7).
 * Returns the existing category's id when the name matches one, otherwise the name as a proposal,
 * which only becomes a real category when the receipt is saved. Null when there is no name: the
 * item is unsorted.
 */
export function matchCategory(
  name: string | null,
  groupCategories: readonly { id: string; name: string }[],
): { categoryId: string; proposed: null } | { categoryId: null; proposed: string } | null {
  if (!name) return null;
  const found = groupCategories.find((c) => categoryKey(c.name) === categoryKey(name));
  return found ? { categoryId: found.id, proposed: null } : { categoryId: null, proposed: name.trim() };
}

/** One line of the review form as sent when saving. discountCents is information only (rule 6). */
export interface ReviewItem {
  name: string;
  priceCents: number;
  discountCents: number | null;
  categoryId: string | null;
  proposedCategory: string | null;
}

/**
 * Checks a receipt before it is saved (SPEC.md rules 8 and 9). Returns one message per problem,
 * keyed "storeName", "purchaseDate", "items", or "item.<n>" for line n (from 0); empty when fine.
 * An item with no category is fine: saving is never blocked by unsorted items (rule 9, US5).
 * A total that does not match the items is not an error either: the screen shows the difference
 * and the person decides (rule 8).
 */
export function validateReview(input: { storeName: string; purchaseDate: string | null; items: readonly ReviewItem[] }) {
  const errors: Record<string, string> = {};
  if (input.storeName.trim().length > 60) errors.storeName = "Keep the store name under 60 characters.";
  if (input.purchaseDate !== null && !isIsoDate(input.purchaseDate)) errors.purchaseDate = "Check the date.";
  if (input.items.length === 0) errors.items = "A receipt needs at least one item.";
  if (input.items.length > MAX_ITEMS) errors.items = `A receipt can have at most ${MAX_ITEMS} items.`;
  input.items.forEach((item, i) => {
    if (item.name.trim().length === 0) errors[`item.${i}`] = "Give the item a name.";
    else if (item.name.trim().length > ITEM_NAME_MAX) errors[`item.${i}`] = `Keep the name under ${ITEM_NAME_MAX} characters.`;
    else if (!Number.isInteger(item.priceCents) || Math.abs(item.priceCents) > 100_000_000) errors[`item.${i}`] = "Check the price.";
    else if (item.discountCents !== null && (!Number.isInteger(item.discountCents) || item.discountCents <= 0)) errors[`item.${i}`] = "Check the discount.";
    else if (item.categoryId !== null && item.proposedCategory !== null) errors[`item.${i}`] = "Choose one category.";
    else if (item.proposedCategory !== null && (item.proposedCategory.trim().length === 0 || item.proposedCategory.trim().length > CATEGORY_NAME_MAX)) {
      errors[`item.${i}`] = `Category names are 1 to ${CATEGORY_NAME_MAX} characters.`;
    }
  });
  return errors;
}

/**
 * The status shown next to a receipt in the list (screen 2): what the person should know at a
 * glance. "tone" picks the colour: act (orange, something to do), done (green), wait (grey),
 * error (red), following the colour meanings of the approved design.
 */
export function receiptStatus(status: string, unsortedCount: number): { label: string; tone: "act" | "done" | "wait" | "error" } {
  if (status === "failed") return { label: "Could not read", tone: "error" };
  if (status === "draft" || status === "reading") return { label: "Reading", tone: "wait" };
  if (status === "ready") return { label: "Review and save", tone: "act" };
  if (unsortedCount > 0) return { label: `${unsortedCount} item${unsortedCount === 1 ? "" : "s"} unsorted`, tone: "act" };
  return { label: "All sorted", tone: "done" };
}

/**
 * A receipt number in a form that can be compared: capitals, no spaces. "FS 0123/4567" and
 * "fs0123/4567" give the same key. Null when there is no number.
 */
export function receiptNumberKey(value: string | null | undefined): string | null {
  const key = (value ?? "").toUpperCase().replace(/\s+/g, "");
  return key.length === 0 ? null : key;
}

/** What duplicate checking needs to know about a receipt. */
export interface DuplicateFacts {
  storeName: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  receiptNumber: string | null;
}

/**
 * A store name in a form that can be compared: no accents, capitals, punctuation or extra spaces.
 * "Intermarché" and "INTERMARCHE" give the same key.
 */
export function storeKey(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Looks for this receipt among the group's saved receipts (SPEC.md rule 9c, agreed 9 Nov 2026).
 * - "block": same store and same receipt number. It is the same piece of paper; it cannot be saved.
 * - "warn": same store, date and total, whatever the receipt numbers say. Probably the same
 *   receipt, but two genuine identical shops happen, so the person decides.
 * The warning runs even when both receipts have different numbers, because a number can be
 * misread: in testing the same Continente receipt was read once as FS AMM004/514739 and once as
 * FS AMW004/514739. It also covers a cropped photo where the number is missing.
 * A receipt number is unique per shop, not across shops, so the store must match too.
 * Returns the first saved receipt that matches, or null.
 */
export function findDuplicate<T extends DuplicateFacts>(
  current: DuplicateFacts,
  saved: readonly T[],
): { kind: "block" | "warn"; match: T } | null {
  const store = current.storeName ? storeKey(current.storeName) : "";
  if (!store) return null;
  const number = receiptNumberKey(current.receiptNumber);
  const sameStore = saved.filter((s) => s.storeName && storeKey(s.storeName) === store);
  if (number) {
    const exact = sameStore.find((s) => receiptNumberKey(s.receiptNumber) === number);
    if (exact) return { kind: "block", match: exact };
  }
  const similar = sameStore.find(
    (s) =>
      current.purchaseDate !== null &&
      s.purchaseDate === current.purchaseDate &&
      current.totalCents !== null &&
      s.totalCents === current.totalCents,
  );
  return similar ? { kind: "warn", match: similar } : null;
}

/**
 * How long a reading can take before it is treated as failed. The server stops a reading after
 * 60 seconds; a receipt still marked "reading" well after that was cut off and will never finish.
 */
export const READING_GIVE_UP_MS = 90_000;

/**
 * The status to show for a receipt (SPEC.md rule 10, fixed 10 Nov 2026): "reading" that started
 * more than READING_GIVE_UP_MS ago, or has no start time, is shown as "failed" so the person
 * gets Retry instead of waiting forever. Every other status is shown as it is.
 */
export function shownStatus<S extends string>(status: S, readingStartedAt: Date | null, now: Date): S | "failed" {
  if (status !== "reading") return status;
  if (!readingStartedAt || now.getTime() - readingStartedAt.getTime() > READING_GIVE_UP_MS) return "failed";
  return status;
}
