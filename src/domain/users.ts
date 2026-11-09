/**
 * Rules about a person in Distill.
 *
 * What it holds: the check on the name a person chooses to be shown as.
 *
 * Why it matters: the Google name is often a full or formal name (for example "Maduabuchi
 * Ogugua Dibiaezue"), and every member sees it on receipts and balances. A person can set a
 * shorter name, such as "Butch", once for every group (SPEC.md rule 1). Pure code.
 * Tests: tests/unit/users.test.ts
 */

/** Longest display name. Fits on one line wherever a member is named. */
export const DISPLAY_NAME_MAX = 30;

/** Checks a chosen display name. Returns the cleaned name, or a message to show next to the field. */
export function checkDisplayName(raw: string): { name: string } | { error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { error: "Enter a name." };
  if (name.length > DISPLAY_NAME_MAX) return { error: `Keep it under ${DISPLAY_NAME_MAX} characters.` };
  return { name };
}
