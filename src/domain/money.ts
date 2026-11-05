/**
 * Money helpers.
 *
 * What it holds: the one rounding function used for every split in the app, and the
 * function that shows an amount as euros.
 *
 * Why it matters: money is stored as whole cents and shares as basis points
 * (10000 = 100%), so there is never a floating point error. When an item is split,
 * the parts must add up to the item price exactly, or the balance drifts by a cent.
 * CLAUDE.md forbids a second rounding function: if splitting changes, change it here.
 *
 * Business rules: SPEC.md rule 15 (shares in cents, largest remainder method).
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
 * Shows cents as euros with a comma decimal, for example 1290 becomes "12,90".
 * The comma format is a UI rule in CLAUDE.md (Portuguese style amounts).
 * No euro sign is added here; screens add it where the design shows one.
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${euros},${rest}`;
}
