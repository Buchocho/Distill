/**
 * Service errors: the expected ways a request can fail.
 *
 * Why it matters: services throw these instead of returning error values, and one place
 * (src/server/api.ts for the API, each page for screens) turns them into a message for the
 * user or an HTTP status code. To add a new kind of failure, add it here and in STATUS.
 */

/** invalid: the input is wrong. not_found: it does not exist or the user is not a member. unauthorized: not signed in. */
export type ServiceErrorCode = "invalid" | "not_found" | "unauthorized";

/**
 * An expected failure, with a message safe to show the user and, for forms,
 * one message per field (for example { name: "Give the group a name." }).
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** The HTTP status code the API returns for each kind of failure. */
export const STATUS: Record<ServiceErrorCode, number> = { invalid: 400, unauthorized: 401, not_found: 404 };
