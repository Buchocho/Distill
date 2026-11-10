ALTER TABLE "items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ledgers" ADD COLUMN "agreed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ledgers" ADD COLUMN "frozen_lines" jsonb;--> statement-breakpoint
ALTER TABLE "ledgers" ADD COLUMN "settled_at" timestamp with time zone;