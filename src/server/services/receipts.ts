/**
 * Receipts service: everything that reads or writes receipts, their photos and their items.
 *
 * What it holds: list a group's receipts, start a receipt and get an upload link for its photo,
 * read the photo with Gemini, load a receipt for review, give a fresh link to its photo, save it,
 * and delete it while it is not yet saved.
 *
 * Why it matters: this is the scan, review and save flow of stories US2 and US5. A receipt goes
 * draft (photo being uploaded) -> reading -> ready (under review) -> saved, or to failed with a
 * retry (SPEC.md rule 10). Services are the only layer that touches the database (architecture
 * rule 2), and every function checks group membership first (architecture rule 4).
 *
 * Business rules: SPEC.md rules 4 (any member adds a receipt and chooses who paid), 5 (a receipt
 * belongs to the period open when it is added), 6 to 9 (reading, categories, sum check, saving
 * never blocked by unsorted items), 9a (photos locked once saved), 10 (failed readings can be
 * retried) and 14a (creating a category is logged). Deleting an unsaved receipt and its photo was
 * agreed with Maduabuchi on 9 Nov 2026 (rule 9b); saved receipts cannot be deleted. The same day,
 * duplicate checking (rule 9c): the same store and receipt number cannot be saved twice.
 * Step 2 handles one photo per receipt; more photos come in step 4.
 */

import "server-only";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { categories, categoryChanges, groups, items, ledgers, receiptPhotos, receipts, users } from "@/server/db/schema";
import { categoryKey, findDuplicate, matchCategory, parseReading, type ReviewItem, validateReview } from "@/domain/receipts";
import { readReceiptPhotos } from "@/server/integrations/gemini";
import { createUploadLink, deletePhotos, downloadPhoto, photoPath, viewLink } from "@/server/integrations/storage";
import { assertMember, getGroupForMember, isMember, UUID } from "./groups";
import { ServiceError } from "./errors";

/** How many receipts the Receipts screen lists. */
const RECENT_LIMIT = 30;

/**
 * Loads a receipt for a member of its group, or stops with "not found". Anyone who is not a member
 * gets the same answer as for a receipt that does not exist (architecture rule 4).
 */
async function receiptForMember(userId: string, receiptId: string) {
  if (!UUID.test(receiptId)) throw new ServiceError("not_found", "Receipt not found.");
  const [receipt] = await db.select().from(receipts).where(eq(receipts.id, receiptId));
  if (!receipt) throw new ServiceError("not_found", "Receipt not found.");
  await assertMember(userId, receipt.groupId).catch(() => {
    throw new ServiceError("not_found", "Receipt not found.");
  });
  return receipt;
}

/**
 * The Receipts screen list (screen 2): newest first, with who paid, the total and how many items
 * have no category. Receipts whose photo is still being uploaded (draft) are left out.
 */
export async function listReceipts(userId: string, groupId: string) {
  await assertMember(userId, groupId);
  const unsorted = sql<number>`count(${items.id}) filter (where ${items.categoryId} is null)`.mapWith(Number);
  return db
    .select({
      id: receipts.id,
      status: receipts.status,
      storeName: receipts.storeName,
      purchaseDate: receipts.purchaseDate,
      totalCents: receipts.totalCents,
      paidByName: users.displayName,
      createdAt: receipts.createdAt,
      unsortedCount: unsorted,
    })
    .from(receipts)
    .innerJoin(users, eq(users.id, receipts.paidBy))
    .leftJoin(items, eq(items.receiptId, receipts.id))
    .where(and(eq(receipts.groupId, groupId), ne(receipts.status, "draft")))
    .groupBy(receipts.id, users.displayName)
    .orderBy(desc(receipts.createdAt))
    .limit(RECENT_LIMIT);
}

/**
 * Starts a receipt when a member takes or chooses a photo (SPEC.md rules 4 and 5).
 * Creates the receipt in the group's open period, paid by the chosen member, and returns a one
 * time link for the browser to upload the photo straight to storage (architecture rule 6).
 */
export async function startReceipt(userId: string, groupId: string, paidBy: string) {
  await assertMember(userId, groupId);
  if (!(await isMember(paidBy, groupId))) {
    throw new ServiceError("invalid", "Check the form.", { paidBy: "Choose someone in the group." });
  }
  const [openLedger] = await db
    .select()
    .from(ledgers)
    .where(and(eq(ledgers.groupId, groupId), eq(ledgers.status, "open")));
  if (!openLedger) throw new ServiceError("invalid", "This group has no open period.");

  return db.transaction(async (tx) => {
    const [receipt] = await tx
      .insert(receipts)
      .values({ groupId, ledgerId: openLedger.id, paidBy, createdBy: userId })
      .returning();
    const path = photoPath(groupId, receipt.id, 1);
    await tx.insert(receiptPhotos).values({ receiptId: receipt.id, position: 1, storagePath: path });
    const upload = await createUploadLink(path);
    return { receiptId: receipt.id, upload };
  });
}

/**
 * Reads a receipt's photo with Gemini and fills in its items for review (SPEC.md rules 6 and 7).
 * localToday is the device's date (rule 2c); Gemini uses it to read dates printed in an unusual order.
 *
 * Each item's category name is matched to the group's list; a name that is not on the list is
 * kept as a proposal and only becomes a category when the receipt is saved (rule 7). Any earlier
 * reading of the same receipt is replaced, which is what Retry does (rule 10).
 * If anything goes wrong the receipt is marked "failed" and kept with its photo; the result says so
 * rather than throwing, so the screen can show Retry.
 */
export async function readReceipt(userId: string, receiptId: string, localToday: string): Promise<{ status: "ready" | "failed" }> {
  const receipt = await receiptForMember(userId, receiptId);
  if (receipt.status === "saved") throw new ServiceError("invalid", "This receipt is already saved.");
  await db.update(receipts).set({ status: "reading" }).where(eq(receipts.id, receiptId));

  try {
    const photos = await db
      .select()
      .from(receiptPhotos)
      .where(eq(receiptPhotos.receiptId, receiptId))
      .orderBy(asc(receiptPhotos.position));
    const groupCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.groupId, receipt.groupId));
    const files = await Promise.all(photos.map((p) => downloadPhoto(p.storagePath)));
    const reading = parseReading(await readReceiptPhotos(files, groupCategories.map((c) => c.name), localToday));

    await db.transaction(async (tx) => {
      await tx.delete(items).where(eq(items.receiptId, receiptId));
      await tx.insert(items).values(
        reading.items.map((item, i) => {
          const match = matchCategory(item.category, groupCategories);
          return {
            receiptId,
            position: i + 1,
            name: item.name,
            priceCents: item.priceCents,
            discountCents: item.discountCents,
            categoryId: match?.categoryId ?? null,
            proposedCategory: match?.proposed ?? null,
          };
        }),
      );
      await tx
        .update(receipts)
        .set({
          status: "ready",
          storeName: reading.storeName,
          receiptNumber: reading.receiptNumber,
          purchaseDate: reading.purchaseDate,
          totalCents: reading.totalCents,
        })
        .where(eq(receipts.id, receiptId));
    });
    return { status: "ready" };
  } catch (error) {
    console.error("Receipt reading failed", receiptId, error);
    await db.update(receipts).set({ status: "failed" }).where(eq(receipts.id, receiptId));
    return { status: "failed" };
  }
}

/**
 * Everything the review screen (screen 3) needs: the receipt, its items in printed order, the
 * group's categories and members to choose from, the group's currency (rule 2b), how many photos
 * it has, and the group's other saved receipts, so the screen can flag a duplicate (rule 9c). Photo links are not made here: they expire, so each is made when it is tapped (photoLink).
 */
export async function getReceipt(userId: string, receiptId: string) {
  const receipt = await receiptForMember(userId, receiptId);
  const [group] = await db.select({ name: groups.name, currency: groups.currency }).from(groups).where(eq(groups.id, receipt.groupId));
  const lines = await db.select().from(items).where(eq(items.receiptId, receiptId)).orderBy(asc(items.position));
  const groupCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.groupId, receipt.groupId))
    .orderBy(asc(categories.name));
  const [{ photoCount }] = await db.select({ photoCount: count() }).from(receiptPhotos).where(eq(receiptPhotos.receiptId, receiptId));
  const { members } = await getGroupForMember(userId, receipt.groupId);
  const saved = receipt.status === "saved" ? [] : await savedReceiptsFor(receipt.groupId, receiptId);
  return {
    receipt,
    currency: group.currency,
    items: lines,
    categories: groupCategories,
    members,
    photoCount,
    saved,
  };
}

/**
 * The group's saved receipts, without the one being reviewed, with what duplicate checking needs
 * (SPEC.md rule 9c) and who paid, so the warning can say which receipt it matches.
 * Limited to the latest 500, which covers months of normal use.
 */
async function savedReceiptsFor(groupId: string, exceptId: string) {
  return db
    .select({
      id: receipts.id,
      storeName: receipts.storeName,
      purchaseDate: receipts.purchaseDate,
      totalCents: receipts.totalCents,
      receiptNumber: receipts.receiptNumber,
      paidByName: users.displayName,
    })
    .from(receipts)
    .innerJoin(users, eq(users.id, receipts.paidBy))
    .where(and(eq(receipts.groupId, groupId), eq(receipts.status, "saved"), ne(receipts.id, exceptId)))
    .orderBy(desc(receipts.savedAt))
    .limit(500);
}

/**
 * A fresh link to one photo of a receipt, made at the moment it is asked for, for members only.
 * The link lasts 10 minutes; because a new one is made on every tap, an old page never shows an
 * expired link (issue found in testing on 7 Nov 2026).
 */
export async function photoLink(userId: string, receiptId: string, position: number): Promise<string> {
  const receipt = await receiptForMember(userId, receiptId);
  const [photo] = await db
    .select()
    .from(receiptPhotos)
    .where(and(eq(receiptPhotos.receiptId, receipt.id), eq(receiptPhotos.position, position)));
  const link = photo ? await viewLink(photo.storagePath) : null;
  if (!link) throw new ServiceError("not_found", "Photo not found.");
  return link;
}

/**
 * Deletes a receipt that has not been saved, with its items and its photos (SPEC.md rule 9b).
 * For a wrong photo, a test, or a receipt that cannot be read. A saved receipt is part of its
 * period's balance and cannot be deleted. The database row goes first, so if removing the photo
 * file fails the receipt is still gone for every member; the file is then only orphaned storage.
 */
export async function deleteReceipt(userId: string, receiptId: string): Promise<void> {
  const receipt = await receiptForMember(userId, receiptId);
  if (receipt.status === "saved") throw new ServiceError("invalid", "A saved receipt cannot be deleted.");
  const photos = await db.select().from(receiptPhotos).where(eq(receiptPhotos.receiptId, receiptId));
  // Photos and items are removed with the receipt (cascade in the database).
  await db.delete(receipts).where(and(eq(receipts.id, receiptId), ne(receipts.status, "saved")));
  await deletePhotos(photos.map((p) => p.storagePath)).catch((error) => console.error("Photo delete failed", receiptId, error));
}

/** What the review screen sends when Save receipt is tapped. */
export interface SaveReceiptInput {
  storeName: string;
  receiptNumber: string | null;
  purchaseDate: string | null;
  totalCents: number | null;
  paidBy: string;
  items: ReviewItem[];
}

/**
 * Saves a reviewed receipt into its period (SPEC.md rules 7, 8, 9 and 9a, stories US2 and US5).
 *
 * In one transaction: proposed categories become real categories (reusing one of the same name if
 * it already exists) and each creation is logged (rule 14a); the items are replaced with the
 * reviewed ones; the receipt is marked saved, which locks its photos (rule 9a).
 * Items with no category are saved as unsorted: saving is never blocked by them (rule 9).
 * A receipt can be saved once; changes after that are item edits (step 3).
 */
export async function saveReceipt(userId: string, receiptId: string, input: SaveReceiptInput) {
  const receipt = await receiptForMember(userId, receiptId);
  if (receipt.status !== "ready") throw new ServiceError("invalid", "This receipt cannot be saved now.");
  const errors = validateReview(input);
  if (!(await isMember(input.paidBy, receipt.groupId))) errors.paidBy = "Choose someone in the group.";
  if (input.totalCents !== null && !Number.isInteger(input.totalCents)) errors.totalCents = "Check the total.";
  if (input.receiptNumber !== null && input.receiptNumber.trim().length > 60) errors.receiptNumber = "Check the receipt number.";
  // The same store and receipt number is already saved: refuse, whatever the screen showed (rule 9c).
  const duplicate = findDuplicate(
    { storeName: input.storeName, purchaseDate: input.purchaseDate, totalCents: input.totalCents, receiptNumber: input.receiptNumber },
    await savedReceiptsFor(receipt.groupId, receiptId),
  );
  if (duplicate?.kind === "block") throw new ServiceError("invalid", "This receipt is already saved in the group.");
  const chosenIds = [...new Set(input.items.map((i) => i.categoryId).filter((id): id is string => id !== null))];
  if (chosenIds.length > 0) {
    if (chosenIds.some((id) => !UUID.test(id))) errors.items = "A chosen category no longer exists.";
    else {
      const [{ n }] = await db
        .select({ n: count() })
        .from(categories)
        .where(and(eq(categories.groupId, receipt.groupId), inArray(categories.id, chosenIds)));
      if (n !== chosenIds.length) errors.items = "A chosen category no longer exists.";
    }
  }
  if (Object.keys(errors).length > 0) throw new ServiceError("invalid", "Check the receipt.", errors);

  return db.transaction(async (tx) => {
    // Lock the receipt first, so two people tapping Save at once cannot both save it.
    const locked = await tx
      .update(receipts)
      .set({
        status: "saved",
        savedAt: new Date(),
        storeName: input.storeName.trim() || null,
        receiptNumber: input.receiptNumber?.trim() || null,
        purchaseDate: input.purchaseDate,
        totalCents: input.totalCents,
        paidBy: input.paidBy,
      })
      .where(and(eq(receipts.id, receiptId), eq(receipts.status, "ready")))
      .returning({ id: receipts.id });
    if (locked.length === 0) throw new ServiceError("invalid", "This receipt was already saved.");

    // Proposed categories become real ones (rule 7). Same name ignoring capitals reuses the existing one.
    const idByKey = new Map<string, string>();
    for (const name of new Set(input.items.map((i) => i.proposedCategory?.trim()).filter((n): n is string => Boolean(n)))) {
      const key = categoryKey(name);
      if (idByKey.has(key)) continue;
      const [existing] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.groupId, receipt.groupId), sql`lower(${categories.name}) = ${key}`));
      if (existing) {
        idByKey.set(key, existing.id);
        continue;
      }
      const [created] = await tx
        .insert(categories)
        .values({ groupId: receipt.groupId, name: name.replace(/\s+/g, " "), createdBy: userId })
        .returning({ id: categories.id });
      await tx.insert(categoryChanges).values({ categoryId: created.id, changedBy: userId, summary: `Created when saving a receipt` });
      idByKey.set(key, created.id);
    }

    await tx.delete(items).where(eq(items.receiptId, receiptId));
    await tx.insert(items).values(
      input.items.map((item, i) => ({
        receiptId,
        position: i + 1,
        name: item.name.trim(),
        priceCents: item.priceCents,
        discountCents: item.discountCents,
        categoryId: item.categoryId ?? (item.proposedCategory ? idByKey.get(categoryKey(item.proposedCategory)) ?? null : null),
        proposedCategory: null,
      })),
    );
    return { receiptId, status: "saved" as const };
  });
}
