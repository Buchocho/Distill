/**
 * Money helpers.
 *
 * What it holds: the one rounding function used for every split in the app, and the
 * functions that show an amount in the group's currency.
 *
 * Why it matters: money is stored as whole cents and shares as basis points
 * (10000 = 100%), so there is never a floating point error. When an item is split,
 * the parts must add up to the item price exactly, or the balance drifts by a cent.
 * CLAUDE.md forbids a second rounding function: if splitting changes, change it here.
 *
 * Business rules: SPEC.md rule 15 (shares in cents, largest remainder method), rule 2b
 * (amounts are shown in the group's currency; display only, nothing is converted) and rule 8
 * (the user can correct prices on the review screen, typed with a comma or a point).
 * Pure functions: no database, network or framework code. Tests: tests/unit/money.test.ts
 */

/** 100% written in basis points. A category's shares must add up to this (SPEC.md rule 11). */
export const FULL_SHARE_BP = 10000;

/**
 * Splits an amount in cents between people, by weight (their share).
 *
 * Example: 1,00 split three ways gives 34 + 33 + 33 cents, never 33 + 33 + 33.
 *
 * How: every person first gets the rounded down part of their share. The cents left
 * over go one at a time to the people with the largest leftover fractions (the
 * "largest remainder method"). On a tie, the earlier person in the list gets the cent,
 * so the same input always gives the same result.
 *
 * Discount lines have a negative price (SPEC.md rule 6). They are split the same way
 * on the positive amount, then the sign is put back.
 *
 * Throws an error for non-whole amounts, an empty list or weights that are all zero,
 * because those would mean a bug upstream, not a user mistake.
 */
export function splitCents(amountCents: number, weights: readonly number[]): number[] {
  // Guard against bad input before doing any arithmetic.
  if (!Number.isInteger(amountCents)) throw new Error("amountCents must be an integer");
  if (weights.length === 0) throw new Error("weights must not be empty");
  if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
    throw new Error("weights must be non-negative integers");
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) throw new Error("weights must not all be zero");

  // Work on the positive amount; the sign is restored at the end.
  const sign = amountCents < 0 ? -1 : 1;
  const amount = Math.abs(amountCents);

  // Step 1: everyone gets the rounded down part of their share.
  const floors = weights.map((w) => Math.floor((amount * w) / totalWeight));
  const remainders = weights.map((w, i) => amount * w - floors[i] * totalWeight);
  let left = amount - floors.reduce((a, b) => a + b, 0);

  // Step 2: hand out the leftover cents, largest remainder first, earlier person on a tie.
  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left === 0) break;
    floors[i] += 1;
    left -= 1;
  }
  // Put the sign back. Zero stays 0 rather than -0.
  return floors.map((c) => (c === 0 ? 0 : c * sign));
}

/**
 * Number style per currency. Euro amounts keep the Portuguese style of the approved design
 * ("12,90 €"); every other currency uses the English style ("$12.90", "₦12.90").
 * Fixed per currency rather than taken from the browser, so the server and the browser
 * always print the same thing (SPEC.md rule 2b).
 */
function localeFor(currency: string): string {
  return currency === "EUR" ? "pt-PT" : "en-US";
}

/**
 * Turns whole cents into an exact decimal string such as "-12.90". The string, not a
 * floating point number, is what is handed to the number formatter, so no rounding can
 * creep in (CLAUDE.md: never use floating point for money).
 */
function centsToDecimal(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Intl accepts exact decimal strings (ES2023), but the TypeScript types in use only list numbers. */
type DecimalFormatter = { format(value: string): string };

/**
 * Shows cents as a plain amount in the group's number style, without a symbol.
 * Example: 1290 becomes "12,90" for EUR and "12.90" for USD. Used where the screen shows
 * the currency once, for example in a column heading.
 */
export function formatCents(cents: number, currency = "EUR"): string {
  const f = new Intl.NumberFormat(localeFor(currency), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (f as unknown as DecimalFormatter).format(centsToDecimal(cents));
}

/**
 * Shows cents with the group's currency symbol, for example "12,90 €", "$12.90" or "₦12.90"
 * (SPEC.md rule 2b). Display only: the amount is never converted between currencies.
 */
export function formatMoney(cents: number, currency: string): string {
  const f = new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (f as unknown as DecimalFormatter).format(centsToDecimal(cents));
}

/**
 * Turns an amount typed by a person or printed on a receipt into whole cents, or null if it is
 * not an amount. Used for prices read by Gemini and prices corrected on the review screen
 * (SPEC.md rules 6 and 8).
 *
 * Accepts both styles, because groups use different currencies (rule 2b): "12,90", "12.90",
 * "1.234,50", "1,234.50", "-1,10" (a discount, rule 6), "12" and "€ 12,90". The last comma or
 * point counts as the decimal mark only when one or two digits follow it; otherwise it is a
 * thousands separator, so "1.234" is 1234,00. Worked on the text itself, never as a floating
 * point number (CLAUDE.md).
 */
export function parseAmount(text: string): number | null {
  // Keep only digits, separators and a minus sign; currency symbols and spaces are dropped.
  let t = text.trim().replace(/[^0-9.,\-]/g, "");
  let negative = false;
  if (t.startsWith("-")) {
    negative = true;
    t = t.slice(1);
  }
  if (t.length === 0 || !/^[0-9.,]+$/.test(t)) return null;
  const last = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
  let whole = t;
  let fraction = "";
  if (last >= 0 && t.length - last - 1 >= 1 && t.length - last - 1 <= 2) {
    whole = t.slice(0, last);
    fraction = t.slice(last + 1);
  }
  whole = whole.replace(/[.,]/g, "");
  if (whole.length === 0) whole = "0";
  if (!/^[0-9]+$/.test(whole) || whole.length > 9) return null;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents === 0 ? 0 : negative ? -cents : cents;
}

