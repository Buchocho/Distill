ALTER TABLE "items" ADD COLUMN "tax_share_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "tax_added_cents" integer;