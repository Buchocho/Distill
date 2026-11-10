/**
 * Groups service: everything that reads or writes groups, members and invites.
 *
 * What it holds: list my groups, create a group, load a group for a member, look up an
 * invite link, and join by invite link.
 *
 * Why it matters: a group is the shared record everyone in a household works from (story US1).
 * Services are the only layer allowed to touch the database (architecture rule 2), and they
 * check membership on every read (architecture rule 4), so a user can never see a group
 * they are not in. Pages and API routes both call these functions.
 *
 * Business rules: SPEC.md rules 2 (creator is a member; anyone with the link who signs in
 * joins), 3 (every member has the same rights, so there is no role check), 18 and 19
 * (the first period opens when the group is made), 2b (currency) and 2c (dates follow the device's local date).
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { groupMembers, groups, ledgers, users } from "@/server/db/schema";
import { type NewGroupInput, validateNewGroup } from "@/domain/groups";
import { firstLedger } from "@/domain/ledgers";
import { ServiceError } from "./errors";
import { ensurePeriods, requestToday } from "./periodClock";

/** Shape of a database id. A group id in the address that does not match is treated as not found. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A random, hard to guess invite code for the link /join/<token>. 18 random bytes, URL safe. */
const newInviteToken = () => randomBytes(18).toString("base64url");

/**
 * The groups a user belongs to, oldest joined first.
 * The first one is where the app sends the user after sign in (see src/app/page.tsx).
 */
export async function listMyGroups(userId: string) {
  return db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groupMembers.joinedAt));
}

/**
 * Creates a group (screen 1, story US1).
 *
 * Three things are saved together, in one transaction, so a half made group can never exist:
 * the group with its invite code, the creator as its first member (SPEC.md rule 2), and the
 * first open period, which runs from today to the first close date (SPEC.md rules 18, 19).
 *
 * localToday is the date on the device creating the group (SPEC.md rule 2c), already checked by
 * the caller, so the first period starts on the creator's own today rather than the UTC date.
 *
 * Throws an "invalid" error with a message per field when the form is not valid.
 */
export async function createGroup(userId: string, input: NewGroupInput, localToday: string) {
  const errors = validateNewGroup(input);
  if (Object.keys(errors).length > 0) throw new ServiceError("invalid", "Check the form.", errors);
  const range = firstLedger(input.close, localToday);

  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: input.name.trim(),
        closeRule: input.close.rule,
        closeDay: input.close.day,
        currency: input.currency,
        inviteToken: newInviteToken(),
        createdBy: userId,
      })
      .returning();
    await tx.insert(groupMembers).values({ groupId: group.id, userId });
    await tx.insert(ledgers).values({ groupId: group.id, startsOn: range.startsOn, endsOn: range.endsOn });
    return group;
  });
}

/**
 * Stops with "not found" unless the user is a member of the group (architecture rule 4).
 * Every service that reads or writes something inside a group calls this first, so the check
 * is the same everywhere. A malformed group id is treated as not found.
 */
export async function assertMember(userId: string, groupId: string): Promise<void> {
  if (!UUID.test(groupId)) throw new ServiceError("not_found", "Group not found.");
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  if (!membership) throw new ServiceError("not_found", "Group not found.");
}

/** True when the person is a member of the group. Used to check "paid by" (SPEC.md rule 4). */
export async function isMember(userId: string, groupId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false;
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return Boolean(row);
}

/**
 * Loads a group with its members and its open period, for members only. Closes the open period
 * first if its last day has passed (SPEC.md rule 19), so every screen and API call sees the right one.
 *
 * A non member gets "not found" rather than "not allowed", so the app does not reveal that
 * a group exists (architecture rule 4). Every screen inside a group starts by calling this.
 * Members are listed in the order they joined.
 */
export async function getGroupForMember(userId: string, groupId: string) {
  // Membership check first: nothing about the group is read until this passes.
  await assertMember(userId, groupId);
  // Close the period if its last day has passed, before anything is read (SPEC.md rule 19).
  await ensurePeriods(groupId, await requestToday());

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const members = await db
    .select({ id: users.id, name: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
  // At most one open period per group; the database enforces this (ledgers_one_open_per_group).
  const [openLedger] = await db
    .select()
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "open")));
  return { group, members, openLedger: openLedger ?? null };
}

/**
 * What someone opening an invite link sees before joining (screen 0b): the group name,
 * who is in it, when accounts close and its currency. Holding the link is the permission, so no
 * membership check is made here. Only these few fields are returned, never the receipts.
 */
export async function getInvite(token: string) {
  const [group] = await db.select().from(groups).where(eq(groups.inviteToken, token));
  if (!group) throw new ServiceError("not_found", "This invite link is not valid.");
  const members = await db
    .select({ id: users.id, name: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, group.id))
    .orderBy(asc(groupMembers.joinedAt));
  return {
    group: { id: group.id, name: group.name, closeRule: group.closeRule, closeDay: group.closeDay, currency: group.currency },
    members,
  };
}

/**
 * Adds the signed in user to the group behind an invite link (SPEC.md rule 2, story US1).
 * Tapping Join twice, or opening the link again later, changes nothing and gives no error.
 */
export async function joinByToken(userId: string, token: string) {
  const { group } = await getInvite(token);
  await db.insert(groupMembers).values({ groupId: group.id, userId }).onConflictDoNothing();
  return group;
}
