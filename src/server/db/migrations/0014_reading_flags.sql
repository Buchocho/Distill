ALTER TABLE "items" ADD COLUMN "reading_flag" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "total_unclear" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "date_unclear" boolean DEFAULT false NOT NULL;