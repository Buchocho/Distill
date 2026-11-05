/**
 * Data loading helpers shared by pages.
 *
 * Why it matters: pages inside a group all need the same thing first: the group, but only if the
 * user is a member. Keeping it here means each page does the membership check the same way.
 */

import "server-only";
import { notFound } from "next/navigation";
import { getGroupForMember } from "@/server/services/groups";
import { ServiceError } from "@/server/services/errors";

/**
 * Loads a group for a page. If the group does not exist or the user is not a member, the
 * "Not found" screen is shown instead (src/app/not-found.tsx). Other errors go to the error screen.
 */
export async function groupOr404(userId: string, groupId: string) {
  try {
    return await getGroupForMember(userId, groupId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  }
}
