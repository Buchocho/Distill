/**
 * Group form validation.
 *
 * What it holds: the check run on the New group form (screen 1) before a group is saved.
 *
 * Why it matters: the same check runs for the web form and for the API (POST /api/v1/groups),
 * so both give the same error messages. The messages returned here are shown to the
 * user next to the field, so they are written as plain instructions.
 *
 * Business rules: SPEC.md rules 2b (currency, display only), 2c (local date), 18 (the group
 * chooses its close rule) and story US1.
 * Pure functions. Tests: tests/unit/groups.test.ts
 */

import { isSupportedCurrency } from "./currencies";
import { type CloseSetting, validateCloseSetting } from "./ledgers";

/** What the New group form sends: a name, when accounts close and the currency amounts are shown in (rule 2b). */
export interface NewGroupInput {
  name: string;
  close: CloseSetting;
  currency: string;
}

/** One error message per form field. An empty object means the form is valid. */
export type FieldErrors = Partial<Record<"name" | "close" | "currency", string>>;

/**
 * Checks the device's local date sent with an action (SPEC.md rule 2c), for example "2026-11-30".
 * The app uses the date on the phone or computer doing the action, so a group in Toronto is not
 * moved to the next day at 7 pm. Anywhere on Earth is at most one day either side of the UTC
 * date, so anything further away is refused as a wrong or tampered value.
 */
export function isValidLocalDate(iso: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return false;
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.abs(d.getTime() - utcToday) <= 86_400_000;
}

/** Today's date as YYYY-MM-DD in UTC. Used only when a caller sends no local date (for example the API). */
export const utcToday = (now: Date = new Date()) => now.toISOString().slice(0, 10);

/** Longest group name allowed. Keeps names readable on a 375 px phone screen. */
export const GROUP_NAME_MAX = 60;

/**
 * Checks a new group before it is created.
 * Returns an error per field (name, close, currency); an empty object means it can be saved.
 * Spaces around the name are ignored, so "  " counts as no name.
 */
export function validateNewGroup(input: NewGroupInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length === 0) errors.name = "Give the group a name.";
  else if (name.length > GROUP_NAME_MAX) errors.name = `Keep the name under ${GROUP_NAME_MAX} characters.`;
  const closeError = validateCloseSetting(input.close);
  if (closeError) errors.close = closeError;
  if (!isSupportedCurrency(input.currency)) errors.currency = "Choose a currency from the list.";
  return errors;
}
