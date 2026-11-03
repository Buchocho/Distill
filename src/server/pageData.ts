import "server-only";
import { notFound } from "next/navigation";
import { getGroupForMember } from "@/server/services/groups";
import { ServiceError } from "@/server/services/errors";

/** Loads a group for a page, showing the 404 page when the user is not a member. */
export async function groupOr404(userId: string, groupId: string) {
  try {
    return await getGroupForMember(userId, groupId);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "not_found") notFound();
    throw e;
  }
}
