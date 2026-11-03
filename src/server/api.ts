import "server-only";
import { apiUser, type AuthUser } from "@/server/auth";
import { ensureUser } from "@/server/services/users";
import { ServiceError, STATUS } from "@/server/services/errors";

/** Wraps an API route: requires a signed in user and turns service errors into JSON responses. */
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

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    throw new ServiceError("invalid", "Send a JSON body.");
  }
}
