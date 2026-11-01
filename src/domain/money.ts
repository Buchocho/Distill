// Money helpers. All amounts are integer cents. Shares are basis points.

export const FULL_SHARE_BP = 10000;

/**
 * Splits an amount in cents by weights using the largest remainder method,
 * so the parts always add up to the amount exactly.
 * Ties on the remainder go to the earlier entry, which keeps results stable.
 * Works for negative amounts (discount lines) by splitting the absolute value.
 */
export function splitCents(amountCents: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(amountCents)) throw new Error("amountCents must be an integer");
  if (weights.length === 0) throw new Error("weights must not be empty");
  if (weights.some((w) => !Number.isInteger(w) || w < 0)) {
    throw new Error("weights must be non-negative integers");
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) throw new Error("weights must not all be zero");

  const sign = amountCents < 0 ? -1 : 1;
  const amount = Math.abs(amountCents);

  const floors = weights.map((w) => Math.floor((amount * w) / totalWeight));
  const remainders = weights.map((w, i) => amount * w - floors[i] * totalWeight);
  let left = amount - floors.reduce((a, b) => a + b, 0);

  const order = remainders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left === 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors.map((c) => (c === 0 ? 0 : c * sign));
}

/** Formats cents as euros with a comma decimal, for example 1290 -> "12,90". */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${euros},${rest}`;
}
