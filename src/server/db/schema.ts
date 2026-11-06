/**
 * Database schema: every table, column and database level check.
 *
 * What it holds: the 12 tables described in docs/DATA_MODEL.md. That document explains each
 * table in plain terms; this file is the code version. Change both together (CLAUDE.md).
 *
 * How a change reaches the database: edit this file, run `npm run db:generate -- --name <what>`
 * to create a migration in ./migrations, and the migration runs on the next Vercel deploy.
 * Every new table also needs Row Level Security switched on in its migration (CLAUDE.md).
 *
 * Conventions: money is integer cents (_cents). Shares are basis points (_bp, 10000 = 100%).
 * Some business rules are also enforced here as database checks, so bad data is refused even
 * if the app code has a bug. Each one names the rule it protects.
 */

import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Standard "created at" column: set by the database to the moment the row is added. */
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** One row per signed in person, created on first Google sign in (SPEC.md rule 1). */
export const users = pgTable("users", {
  // Equals the Supabase Auth user id.
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
});

/**
 * A household or any set of people who shop together (story US1).
 * The check below allows only valid close choices (SPEC.md rule 18), same as src/domain/ledgers.ts.
 * currency (rule 2b) is display only; the list of allowed codes is in src/domain/currencies.ts.
 * Groups made before the currency column existed get EUR.
 */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    closeRule: text("close_rule", { enum: ["month_end", "month_day", "weekly"] }).notNull(),
    closeDay: smallint("close_day"),
    currency: text("currency").notNull().default("EUR"),
    inviteToken: text("invite_token").notNull().unique(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "groups_close_day_valid",
      sql`(${t.closeRule} = 'month_end' and ${t.closeDay} is null)
        or (${t.closeRule} = 'month_day' and ${t.closeDay} between 1 and 28)
        or (${t.closeRule} = 'weekly' and ${t.closeDay} between 0 and 6)`,
    ),
    // Rule 2b: a three letter currency code. The full list is checked in the app.
    check("groups_currency_code", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

/** Who is in which group. No role column: every member has the same rights (SPEC.md rule 3). */
export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

/**
 * Periods, called ledgers in the code. A group has many; at most one is open at a time, enforced
 * by the unique index below (SPEC.md rule 19). End date is included in the period.
 */
export const ledgers = pgTable(
  "ledgers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("ledgers_one_open_per_group").on(t.groupId).where(sql`${t.status} = 'open'`),
    check("ledgers_dates_valid", sql`${t.endsOn} >= ${t.startsOn}`),
  ],
);

/**
 * A group's categories (for example Bread, Snacks). Names are unique per group ignoring capitals,
 * so "milk" and "Milk" cannot both exist (SPEC.md rule 7).
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // For a category proposed by the reading step: the user who saved the receipt.
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_name_per_group").on(t.groupId, sql`lower(${t.name})`)],
);

// The sharing rule: who shares a category and each person's share. Shares for one category must
// total 10000 (100%, SPEC.md rule 11). No rows means no rule yet: its items stay out of the balance
// and block agreement until a rule is set (SPEC.md rules 12, 17, 21).
export const categoryShares = pgTable(
  "category_shares",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    shareBp: integer("share_bp").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.userId] }),
    check("category_shares_bp_range", sql`${t.shareBp} between 1 and 10000`),
  ],
);

/**
 * One shop. Belongs to the period open when it was added, not the printed date (SPEC.md rule 5).
 * Status: draft (photos being added), reading, ready (under review), failed (can retry,
 * SPEC.md rule 10), saved (in the ledger; photos locked, SPEC.md rule 9a).
 */
export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    ledgerId: uuid("ledger_id").notNull().references(() => ledgers.id),
    paidBy: uuid("paid_by").notNull().references(() => users.id),
    storeName: text("store_name"),
    purchaseDate: date("purchase_date"),
    totalCents: integer("total_cents"),
    status: text("status", { enum: ["draft", "reading", "ready", "failed", "saved"] })
      .notNull()
      .default("draft"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    savedAt: timestamp("saved_at", { withTimezone: true }),
  },
  (t) => [index("receipts_ledger").on(t.ledgerId)],
);

/** The photos of one receipt, in order. A long receipt can be several photos (SPEC.md rule 9a). */
export const receiptPhotos = pgTable(
  "receipt_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("receipt_photos_position").on(t.receiptId, t.position),
    check("receipt_photos_position_positive", sql`${t.position} >= 1`),
  ],
);

/** One line on a receipt. Follows its category's sharing rule; there are no per item splits (SPEC.md rule 13). */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    name: text("name").notNull(),
    // Negative for discount lines.
    priceCents: integer("price_cents").notNull(),
    // Null means unsorted.
    categoryId: uuid("category_id").references(() => categories.id),
    // Null when set by the reading step.
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_receipt").on(t.receiptId), index("items_category").on(t.categoryId)],
);

/** History of edits to an item, shown to every member (SPEC.md rule 14, story US4). */
export const itemChanges = pgTable(
  "item_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    changedBy: uuid("changed_by").notNull().references(() => users.id),
    summary: text("summary").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("item_changes_item").on(t.itemId)],
);

/** History of category creation and rule changes, shown on screen 4c (SPEC.md rule 14a). */
export const categoryChanges = pgTable(
  "category_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    changedBy: uuid("changed_by").notNull().references(() => users.id),
    summary: text("summary").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("category_changes_category").on(t.categoryId)],
);

/**
 * Who agreed to their amount for a period (SPEC.md rule 22, story US8). Rows are deleted when
 * the period's items change, which resets agreement.
 */
export const agreements = pgTable(
  "agreements",
  {
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    agreedAt: timestamp("agreed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ledgerId, t.userId] })],
);

/**
 * Money one member says they paid another. No money moves in the app. Shown as paid only once
 * confirmed_at is set by the other person (SPEC.md rules 24, 25, story US9). The checks below
 * refuse zero amounts, paying yourself, and a payment recorded by someone not involved.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ledgerId: uuid("ledger_id")
      .notNull()
      .references(() => ledgers.id, { onDelete: "cascade" }),
    fromUser: uuid("from_user").notNull().references(() => users.id),
    toUser: uuid("to_user").notNull().references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    paidOn: date("paid_on").notNull(),
    recordedBy: uuid("recorded_by").notNull().references(() => users.id),
    createdAt: createdAt(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_ledger").on(t.ledgerId),
    check("payments_amount_positive", sql`${t.amountCents} > 0`),
    check("payments_different_people", sql`${t.fromUser} <> ${t.toUser}`),
    check(
      "payments_recorded_by_party",
      sql`${t.recordedBy} = ${t.fromUser} or ${t.recordedBy} = ${t.toUser}`,
    ),
  ],
);
