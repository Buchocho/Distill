ALTER TABLE "group_members" ADD COLUMN "joined_on" date DEFAULT current_date NOT NULL;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "left_on" date;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "removed_by" uuid;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Existing members: the day they joined. The group's creator counts from the group's first day,
-- so items on that day are theirs even if the clock's date differed (SPEC.md rule 2d).
UPDATE "group_members" gm SET "joined_on" = CASE
  WHEN gm."user_id" = g."created_by" THEN (SELECT min(l."starts_on") FROM "ledgers" l WHERE l."group_id" = gm."group_id")
  ELSE gm."joined_at"::date
END
FROM "groups" g WHERE g."id" = gm."group_id";
