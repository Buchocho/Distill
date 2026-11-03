import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { groupMembers, groups, ledgers, users } from "@/server/db/schema";
import { type NewGroupInput, validateNewGroup } from "@/domain/groups";
import { firstLedger } from "@/domain/ledgers";
import { ServiceError } from "./errors";

const todayIso = () => new Date().toISOString().slice(0, 10);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const newInviteToken = () => randomBytes(18).toString("base64url");

/** Groups the user belongs to, oldest first. */
export async function listMyGroups(userId: string) {
  return db
    .select({ id: groups.id, name: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groupMembers.joinedAt));
}

/** Creates a group with its creator as the first member and opens the first ledger. */
export async function createGroup(userId: string, input: NewGroupInput) {
  const errors = validateNewGroup(input);
  if (Object.keys(errors).length > 0) throw new ServiceError("invalid", "Check the form.", errors);
  const range = firstLedger(input.close, todayIso());

  return db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        name: input.name.trim(),
        closeRule: input.close.rule,
        closeDay: input.close.day,
        inviteToken: newInviteToken(),
        createdBy: userId,
      })
      .returning();
    await tx.insert(groupMembers).values({ groupId: group.id, userId });
    await tx.insert(ledgers).values({ groupId: group.id, startsOn: range.startsOn, endsOn: range.endsOn });
    return group;
  });
}

/** A group with its members and open ledger. Only for members. */
export async function getGroupForMember(userId: string, groupId: string) {
  if (!UUID.test(groupId)) throw new ServiceError("not_found", "Group not found.");
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  if (!membership) throw new ServiceError("not_found", "Group not found.");

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const members = await db
    .select({ id: users.id, name: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
  const [openLedger] = await db
    .select()
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "open")));
  return { group, members, openLedger: openLedger ?? null };
}

/** What someone opening an invite link sees before joining. */
export async function getInvite(token: string) {
  const [group] = await db.select().from(groups).where(eq(groups.inviteToken, token));
  if (!group) throw new ServiceError("not_found", "This invite link is not valid.");
  const members = await db
    .select({ id: users.id, name: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, group.id))
    .orderBy(asc(groupMembers.joinedAt));
  return { group: { id: group.id, name: group.name, closeRule: group.closeRule, closeDay: group.closeDay }, members };
}

/** Adds the user to the group behind an invite link. Joining twice is harmless. */
export async function joinByToken(userId: string, token: string) {
  const { group } = await getInvite(token);
  await db.insert(groupMembers).values({ groupId: group.id, userId }).onConflictDoNothing();
  return group;
}
