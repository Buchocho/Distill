/**
 * Receipt rules: what a reading must contain, the sum check, and matching items to categories.
 *
 * What it holds: the check on Gemini's answer (parseReading), the "items add up to the total"
 * check shown on the review screen (sumCheck), how a category name from the reading is matched
 * to the group's list (matchCategory), and the check on a receipt before it is saved
 * (validateReview).
 *
 * Why it matters: the reading step is the part of Distill most likely to be wrong. Gemini's answer
 * is never trusted as it comes: anything malformed is dropped or refused here, prices become whole
 * cents, and the person reviewing sees whether the items match the printed total before saving.
 *
 * Business rules: SPEC.md rules 6 (store, date, total, items; an item's price is what was paid
 * after its discount, and the discount is kept for information only; tax lines are items),
 * 7 (category, at product type level, from the group's list or a proposed new one), 8 (sum check, edits before
 * saving) and 9 (unsorted items never block saving). Stories US2 and US5.
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
  priceCents: number;
  discountCents: number | null;
  category: string | null;
}

/** What the reading step returns (SPEC.md rule 6). Any field it could not read is null. */
export interface Reading {
  storeName: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  items: ReadItem[];
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
 * Lenient on single lines, strict on the whole: a line without a name or a readable price is
 * dropped, because one bad line should not lose the receipt. An answer with no usable lines at
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
    const priceCents = cleanAmount(e.price);
    if (!name || priceCents === null) continue;
    // A discount is stored as a positive amount whichever way it was written; zero means none.
    const discount = cleanAmount(e.discount);
    const discountCents = discount === null || discount === 0 ? null : Math.abs(discount);
    items.push({ name, priceCents, discountCents, category: cleanText(e.category, CATEGORY_NAME_MAX) });
  }
  if (items.length === 0) throw new Error("Reading has no items");
  const date = cleanText(r.date, 10);
  return {
    storeName: cleanText(r.store, 60),
    purchaseDate: date && isIsoDate(date) ? date : null,
    totalCents: cleanAmount(r.total),
    items,
  };
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
