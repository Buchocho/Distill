ALTER TABLE "groups" ADD COLUMN "close_rule_changed_by" uuid;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "close_rule_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_close_rule_changed_by_users_id_fk" FOREIGN KEY ("close_rule_changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;