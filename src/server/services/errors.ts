export type ServiceErrorCode = "invalid" | "not_found" | "unauthorized";

/** An expected failure that a page or API route turns into a message or status code. */
export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const STATUS: Record<ServiceErrorCode, number> = { invalid: 400, unauthorized: 401, not_found: 404 };
