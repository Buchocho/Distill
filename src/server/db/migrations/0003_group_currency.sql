ALTER TABLE "groups" ADD COLUMN "currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_currency_code" CHECK ("groups"."currency" ~ '^[A-Z]{3}$');