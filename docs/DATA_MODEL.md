# Distill: data model

Author: Maduabuchi Ogugua Dibiaezue
Status: draft, 25 Oct 2026. Defined before any screen is built.

Implemented in `src/server/db/schema.ts`, migrations in `src/server/db/migrations`. Row Level Security is enabled on every table with no policies.

Conventions: primary keys are UUIDs unless noted. Money is integer cents (`_cents`). Shares are basis points (`_bp`, 10000 = 100%). All timestamps are `timestamptz`.

## Tables

### users
One row per signed-in person, created on first Google sign in. The id is the Supabase Auth user id.

| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK, equals the Supabase Auth user id |
| email | text | unique, not null; from the Google account |
| display_name | text | not null |
| created_at | timestamptz | default now() |

### groups
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| name | text | not null |
| close_rule | text | not null, one of `month_end`, `month_day`, `weekly` |
| close_day | smallint | null for `month_end`; 1 to 28 for `month_day`; 0 to 6 (Monday = 0) for `weekly` |
| invite_token | text | unique, not null; can be regenerated |
| created_by | uuid | FK users.id |
| created_at | timestamptz | |

### group_members
| Column | Type | Key / rule |
|---|---|---|
| group_id | uuid | PK part, FK groups.id |
| user_id | uuid | PK part, FK users.id |
| joined_at | timestamptz | |

### ledgers
Shown in the app as a period. One group has many ledgers; at most one is open.

| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK groups.id |
| starts_on | date | not null |
| ends_on | date | not null, inclusive |
| status | text | `open` or `closed` |
| closed_at | timestamptz | null while open |

Rule: at most one `open` ledger per group (partial unique index on group_id where status = 'open').

### categories
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK groups.id |
| name | text | not null; unique per group, case insensitive |
| created_by | uuid | FK users.id, not null; for a category proposed by the reading step, the user who saved the receipt |
| created_at | timestamptz | |

### category_shares
The sharing rule. No rows for a category means everyone in the group shares it equally.

| Column | Type | Key / rule |
|---|---|---|
| category_id | uuid | PK part, FK categories.id, cascade delete |
| user_id | uuid | PK part, FK users.id |
| share_bp | integer | 1 to 10000; rows for one category sum to 10000 |

### receipts
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK groups.id |
| ledger_id | uuid | FK ledgers.id; the ledger open when the receipt was added |
| paid_by | uuid | FK users.id |
| store_name | text | null until read |
| purchase_date | date | null until read |
| total_cents | integer | printed total, null until read |
| status | text | `draft` (photos being added), `reading`, `ready` (read, under review), `failed`, `saved` (in the ledger; photos locked) |
| created_by | uuid | FK users.id |
| created_at | timestamptz | |
| saved_at | timestamptz | null until saved |

### receipt_photos
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| receipt_id | uuid | FK receipts.id, cascade delete |
| position | smallint | 1 and up, no upper limit; unique with receipt_id |
| storage_path | text | path in the private bucket |
| created_at | timestamptz | |

### items
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| receipt_id | uuid | FK receipts.id, cascade delete |
| position | smallint | order on the receipt |
| name | text | as printed |
| price_cents | integer | negative allowed for discount lines |
| category_id | uuid | FK categories.id, null = unsorted |
| updated_by | uuid | FK users.id, null when set by the reading step |
| updated_at | timestamptz | |

### item_changes
Makes changes visible to all members (US4).

| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK items.id, cascade delete |
| changed_by | uuid | FK users.id |
| summary | text | for example "Category: Snacks to Bread" |
| changed_at | timestamptz | |

### agreements
| Column | Type | Key / rule |
|---|---|---|
| ledger_id | uuid | PK part, FK ledgers.id |
| user_id | uuid | PK part, FK users.id |
| agreed_at | timestamptz | |

Rule: any change to an item in a closed ledger deletes that ledger's agreements (US8, "a change resets it").

### payments
| Column | Type | Key / rule |
|---|---|---|
| id | uuid | PK |
| ledger_id | uuid | FK ledgers.id; the ledger this payment settles |
| from_user | uuid | FK users.id, the person who paid |
| to_user | uuid | FK users.id, the person paid; different from from_user |
| amount_cents | integer | greater than 0 |
| paid_on | date | |
| recorded_by | uuid | FK users.id; must be from_user or to_user |
| created_at | timestamptz | |
| confirmed_at | timestamptz | null until the other person confirms |

## Relations

```
users 1..* group_members *..1 groups
groups 1..* ledgers
groups 1..* categories 1..* category_shares *..1 users
groups 1..* receipts *..1 ledgers
receipts 1..* receipt_photos
receipts 1..* items *..0..1 categories
items 1..* item_changes
ledgers 1..* agreements *..1 users
ledgers 1..* payments
```

## Derived, not stored

- Balances are calculated from items, category shares, receipts and confirmed payments each time. They are never stored, so they cannot go out of date.
- An item is unsorted when `category_id` is null.
- Sharing rules live only on categories. An item always follows its category's rule.
- A receipt's sum check compares the sum of `price_cents` with `total_cents`.
