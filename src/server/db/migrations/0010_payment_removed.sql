ALTER TABLE "payments" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "removed_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_or_removed" CHECK ("payments"."confirmed_at" is null or "payments"."removed_at" is null);