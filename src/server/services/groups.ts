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
 * joins), 2d and 2e (membership has dates; leaving and removing, 10 Nov 2026), 3 (every member has the same rights, so there is no role check), 18 and 19
 * (the first period opens when the group is made), 2b (currency) and 2c (dates follow the device's local date).
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { groupMembers, groups, items, ledgers, receipts, users } from "@/server/db/schema";
import { type NewGroupInput, validateNewGroup } from "@/domain/groups";
import { firstLedger } from "@/domain/ledgers";
import { itemDay, membersOn, periodMembers, type Membership } from "@/domain/members";
import { periodStage } from "@/domain/periods";
import { ServiceError } from "./errors";
import { ensurePeriods, requestToday } from "./periodClock";

/** Shape of a database id. A group id in the address that does not match is treated as not found. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A random, hard to guess invite code for the link /join/<token>. 18 random bytes, URL safe. */
const newInviteToken = () => randomBytes(18).toString("base64url");

/**
 * The groups a user belongs to, oldest joined first, with the day they left (null while still in).
 * A group they left stays listed until every period they were part of is settled (rule 2e), so
 * they can still agree and pay; then it drops off. After sign in, one group opens straight away
 * and two or more are listed on Your groups to choose from (see src/app/page.tsx, rule 3b).
 */
export async function listMyGroups(userId: string) {
  const rows = await db
    .select({ id: groups.id, name: groups.name, leftOn: groupMembers.leftOn, joinedOn: groupMembers.joinedOn })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groupMembers.joinedAt));
  const shown = [];
  for (const r of rows) {
    if (r.leftOn === null || (await stillToSettle(r.id, { userId, joinedOn: r.joinedOn, leftOn: r.leftOn }))) {
      shown.push({ id: r.id, name: r.name, leftOn: r.leftOn });
    }
  }
  return shown;
}

/**
 * True while someone who left still has something to settle in the group (rule 2e): a period
 * not settled yet that involves them. Agreed periods involve them when the frozen amounts name
 * them; open and closed ones when they paid for an item in it, or an item in it was bought while
 * they were a member (the same test as periodPeople). Someone who left with nothing in any period
 * loses the group at once (found by Maduabuchi, 10 Nov 2026: a group joined and left on the same
 * day, with no receipts, stayed listed with nothing to do).
 */
async function stillToSettle(groupId: string, m: Membership): Promise<boolean> {
  const all = await db.select().from(ledgers).where(eq(ledgers.groupId, groupId));
  for (const l of all) {
    const stage = periodStage(l);
    if (stage === "settled" || periodMembers([m], l.startsOn, l.endsOn).length === 0) continue;
    if (stage === "agreed") {
      if ((l.frozenLines ?? []).some((line) => line.from === m.userId || line.to === m.userId)) return true;
      continue;
    }
    const rows = await db
      .select({ payerId: receipts.paidBy, purchaseDate: receipts.purchaseDate, savedAt: receipts.savedAt })
      .from(items)
      .innerJoin(receipts, eq(receipts.id, items.receiptId))
      .where(and(eq(receipts.ledgerId, l.id), eq(receipts.status, "saved"), isNull(items.deletedAt)));
    const involved = rows.some(
      (r) => r.payerId === m.userId || membersOn([m], itemDay(r.purchaseDate, r.savedAt?.toISOString().slice(0, 10) ?? null, l.startsOn)).length > 0,
    );
    if (involved) return true;
  }
  return false;
}

/** Every membership of a group, current and past, for working out who shares what (rule 2d). */
export async function membershipsOf(groupId: string): Promise<Membership[]> {
  return db
    .select({ userId: groupMembers.userId, joinedOn: groupMembers.joinedOn, leftOn: groupMembers.leftOn })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
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
    await tx.insert(groupMembers).values({ groupId: group.id, userId, joinedOn: localToday });
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
  // Someone who left keeps access only while they still have something to settle (rule 2e).
  if (membership.leftOn && !(await stillToSettle(groupId, { userId, joinedOn: membership.joinedOn, leftOn: membership.leftOn }))) {
    throw new ServiceError("not_found", "Group not found.");
  }
}

/** True when the person is a current member of the group (not left). Used to check "paid by" (SPEC.md rule 4). */
export async function isMember(userId: string, groupId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false;
  const [row] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return Boolean(row) && row.leftOn === null;
}

/**
 * Stops unless the user is still in the group (rule 2e). Someone who left or was removed can still
 * read the group, agree their periods and settle payments (assertMember), but not add receipts or
 * change categories, rules or items: those call this instead.
 */
export async function assertCurrentMember(userId: string, groupId: string): Promise<void> {
  await assertMember(userId, groupId);
  const [row] = await db
    .select({ leftOn: groupMembers.leftOn })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  if (row?.leftOn) throw new ServiceError("forbidden", "You left this group. You can still agree and settle what you owe, but not add or change anything.");
}

/**
 * Loads a group with its members and its open period, for members only. Closes the open period
 * first if its last day has passed (SPEC.md rule 19), so every screen and API call sees the right one.
 *
 * A non member gets "not found" rather than "not allowed", so the app does not reveal that
 * a group exists (architecture rule 4). Every screen inside a group starts by calling this.
 * Members are listed in the order they joined, with name, Google email and membership dates,
 * including people who left (rule 2e); `me` is the reader's own membership.
 */
export async function getGroupForMember(userId: string, groupId: string) {
  // Membership check first: nothing about the group is read until this passes.
  await assertMember(userId, groupId);
  // Close the period if its last day has passed, before anything is read (SPEC.md rule 19).
  await ensurePeriods(groupId, await requestToday());

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const members = await db
    // The email is shown to other members on Invite people so they can tell which Google account
    // joined (SPEC.md rule 2a, decided 10 Nov 2026).
    .select({
      id: users.id,
      name: users.displayName,
      email: users.email,
      joinedOn: groupMembers.joinedOn,
      leftOn: groupMembers.leftOn,
      removedBy: groupMembers.removedBy,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));
  // At most one open period per group; the database enforces this (ledgers_one_open_per_group).
  const [openLedger] = await db
    .select()
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "open")));
  const me = members.find((m) => m.id === userId);
  return { group, members, openLedger: openLedger ?? null, me: { id: userId, leftOn: me?.leftOn ?? null } };
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
    .where(and(eq(groupMembers.groupId, group.id), isNull(groupMembers.leftOn)))
    .orderBy(asc(groupMembers.joinedAt));
  return {
    group: { id: group.id, name: group.name, closeRule: group.closeRule, closeDay: group.closeDay, currency: group.currency },
    members,
  };
}

/**
 * Adds the signed in user to the group behind an invite link (SPEC.md rule 2, story US1), from
 * the device's today (rule 2d). Tapping Join twice, or opening the link again later, changes
 * nothing and gives no error. Someone who left and comes back rejoins from today; known limit:
 * the first stay's dates are replaced, so their share of items from before they left is recounted
 * in periods not yet agreed (rule 2e).
 */
export async function joinByToken(userId: string, token: string) {
  const { group } = await getInvite(token);
  const today = await requestToday();
  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
  if (!existing) {
    await db.insert(groupMembers).values({ groupId: group.id, userId, joinedOn: today }).onConflictDoNothing();
  } else if (existing.leftOn) {
    await db
      .update(groupMembers)
      .set({ joinedOn: today, leftOn: null, removedBy: null })
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)));
  }
  return group;
}

/**
 * Takes someone out of a group from today (rules 2e and 3, decided 10 Nov 2026): the person
 * themselves (leaving) or any other current member (removing); there is no admin. Nothing is
 * deleted: they stay in splits for everything bought before today, still agree the periods they
 * were part of, and still pay or get paid. From today they are in no new splits, and rules that
 * name them need redoing for new items. Who removed whom is kept and shown to everyone.
 */
export async function removeMember(actorId: string, groupId: string, targetId: string) {
  await assertCurrentMember(actorId, groupId);
  if (!UUID.test(targetId)) throw new ServiceError("not_found", "Member not found.");
  const [target] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId)));
  if (!target || target.leftOn) throw new ServiceError("not_found", "Member not found.");
  const today = await requestToday();
  await db
    .update(groupMembers)
    .set({ leftOn: today, removedBy: actorId === targetId ? null : actorId })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetId), isNull(groupMembers.leftOn)));
  return { userId: targetId, leftOn: today, removed: actorId !== targetId };
}

/**
 * Everything the Your groups screen needs (SPEC.md rule 3b, added 10 Nov 2026): each group the
 * user belongs to, oldest joined first, with its current members' first names, and for a group
 * they left, the day they left (shown as "settle up" until it is settled, rule 2e). A person can
 * belong to several groups, for example flatmates and family; this is where they choose one.
 */
export async function myGroupsOverview(userId: string) {
  const mine = await listMyGroups(userId);
  if (mine.length === 0) return [];
  const rows = await db
    .select({ groupId: groupMembers.groupId, userId: users.id, name: users.displayName })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(and(inArray(groupMembers.groupId, mine.map((g) => g.id)), isNull(groupMembers.leftOn)))
    .orderBy(asc(groupMembers.joinedAt));
  return mine.map((g) => ({
    ...g,
    members: rows.filter((r) => r.groupId === g.id).map((r) => (r.userId === userId ? "You" : r.name.split(" ")[0])),
  }));
}
