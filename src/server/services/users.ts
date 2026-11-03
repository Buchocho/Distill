import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth";

/** Creates the user's row on first sign in. Returns the stored user. */
export async function ensureUser(auth: AuthUser) {
  await db
    .insert(users)
    .values({ id: auth.id, email: auth.email, displayName: auth.name })
    .onConflictDoNothing({ target: users.id });
  const [row] = await db.select().from(users).where(eq(users.id, auth.id));
  return row;
}
