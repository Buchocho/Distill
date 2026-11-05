/**
 * Group form validation.
 *
 * What it holds: the check run on the New group form (screen 1) before a group is saved.
 *
 * Why it matters: the same check runs for the web form and for the API (POST /api/v1/groups),
 * so both give the same error messages. The messages returned here are shown to the
 * user next to the field, so they are written as plain instructions.
 *
 * Business rules: SPEC.md rule 18 (the group chooses its close rule) and story US1.
 * Pure functions. Tests: tests/unit/groups.test.ts
 */

import { type CloseSetting, validateCloseSetting } from "./ledgers";

/** What the New group form sends: a name and when accounts close. */
export interface NewGroupInput {
  name: string;
  close: CloseSetting;
}

/** One error message per form field. An empty object means the form is valid. */
export type FieldErrors = Partial<Record<"name" | "close", string>>;

/** Longest group name allowed. Keeps names readable on a 375 px phone screen. */
export const GROUP_NAME_MAX = 60;

/**
 * Checks a new group before it is created.
 * Returns an error per field (name, close); an empty object means it can be saved.
 * Spaces around the name are ignored, so "  " counts as no name.
 */
export function validateNewGroup(input: NewGroupInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length === 0) errors.name = "Give the group a name.";
  else if (name.length > GROUP_NAME_MAX) errors.name = `Keep the name under ${GROUP_NAME_MAX} characters.`;
  const closeError = validateCloseSetting(input.close);
  if (closeError) errors.close = closeError;
  return errors;
}
