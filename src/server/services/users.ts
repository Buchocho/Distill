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
import { checkDisplayName } from "@/domain/users";
import { ServiceError } from "./errors";

/**
 * Creates the user's row on first sign in and returns the stored user.
 *
 * Called on every page and API request. The Google name becomes the display name the first time
 * (SPEC.md rule 1). If the row already exists nothing is changed, so a name the person chose
 * later is never overwritten by their Google name when they sign in again.
 */
export async function ensureUser(auth: AuthUser) {
  await db
    .insert(users)
    .values({ id: auth.id, email: auth.email, displayName: auth.name })
    .onConflictDoNothing({ target: users.id });
  const [row] = await db.select().from(users).where(eq(users.id, auth.id));
  return row;
}

/**
 * Changes the name a person is shown as, in every group (SPEC.md rule 1). For example "Butch"
 * instead of a long Google name. Throws "invalid" with a message when the name is empty or too long.
 */
export async function setDisplayName(userId: string, raw: string) {
  const checked = checkDisplayName(raw);
  if ("error" in checked) throw new ServiceError("invalid", "Check the name.", { displayName: checked.error });
  const [row] = await db.update(users).set({ displayName: checked.name }).where(eq(users.id, userId)).returning();
  return { id: row.id, displayName: row.displayName };
}

