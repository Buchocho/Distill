/**
 * Shared helpers for the HTTP API routes under src/app/api/v1.
 *
 * Why it matters: every action a page can do is also available through the API, so other
 * applications can use the app in later assignments (architecture rule 3). This file makes
 * every API route behave the same way: sign in required, the same JSON error format
 * (documented in docs/API.md), and no internal error details sent to the caller.
 */

import "server-only";
import { apiUser, type AuthUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";
import { ServiceError, STATUS } from "@/server/services/errors";

/**
 * Wraps an API route handler.
 *
 * Before the handler runs: finds the caller (browser cookie or bearer token) and refuses with
 * 401 if they are not signed in, then makes sure their user row exists.
 * After: sends the handler's result as JSON, or { ok: true } when it returns nothing.
 * On failure: an expected ServiceError becomes its status code and message; anything else is
 * logged on the server and the caller only sees "Something went wrong." with status 500.
 */
export function withUser<C>(handler: (user: AuthUser, request: Request, context: C) => Promise<unknown>) {
  return async (request: Request, context: C) => {
    try {
      const user = await apiUser(request);
      if (!user) throw new ServiceError("unauthorized", "Sign in first.");
      await ensureUser(user);
      const result = await handler(user, request, context);
      return Response.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof ServiceError) {
        return Response.json({ error: error.message, fields: error.fields }, { status: STATUS[error.code] });
      }
      console.error(error);
      return Response.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/**
 * Reads the JSON body of an API request. Anything that is not a JSON object becomes an empty
 * object, so the service's own validation then reports which fields are missing.
 * A body that is not JSON at all is refused with 400.
 */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    throw new ServiceError("invalid", "Send a JSON body.");
  }
}
