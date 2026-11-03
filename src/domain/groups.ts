// Validation for creating a group. Pure functions.

import { type CloseSetting, validateCloseSetting } from "./ledgers";

export interface NewGroupInput {
  name: string;
  close: CloseSetting;
}

export type FieldErrors = Partial<Record<"name" | "close", string>>;

export const GROUP_NAME_MAX = 60;

export function validateNewGroup(input: NewGroupInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length === 0) errors.name = "Give the group a name.";
  else if (name.length > GROUP_NAME_MAX) errors.name = `Keep the name under ${GROUP_NAME_MAX} characters.`;
  const closeError = validateCloseSetting(input.close);
  if (closeError) errors.close = closeError;
  return errors;
}
