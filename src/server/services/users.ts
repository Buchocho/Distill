/**
 * Users service: keeps the app's own record of each signed in person.
 *
 * Why it matters: sign in is handled by Supabase with a Google account (SPEC.md rule 1), but
 * receipts, shares, agreements and payments all point to a row in the app's users table.
 * This file makes sure that row exists before any of those are saved.
 */

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import type { AuthUser } from "@/server/auth";

/**
 * Creates the user's row on first sign in and returns the stored user.
 *
 * Called on every page and API request. The Google name becomes the display name (SPEC.md rule 1).
 * If the row already exists nothing is changed, so it keeps working if name editing is added later.
 */
export async function ensureUser(auth: AuthUser) {
  await db
    .insert(users)
    .values({ id: auth.id, email: auth.email, displayName: auth.name })
    .onConflictDoNothing({ target: users.id });
  const [row] = await db.select().from(users).where(eq(users.id, auth.id));
  return row;
}
