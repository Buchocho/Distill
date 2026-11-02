CREATE TABLE "category_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"summary" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_changes" ADD CONSTRAINT "category_changes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_changes" ADD CONSTRAINT "category_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_changes_category" ON "category_changes" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "category_changes" ENABLE ROW LEVEL SECURITY;
