CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"created_by_actor_type" "actor_type" DEFAULT 'user' NOT NULL,
	"created_by_actor_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sprints_dates_check" CHECK (start_date <= end_date),
	CONSTRAINT "sprints_status_check" CHECK (status IN ('planning', 'active', 'completed', 'cancelled'))
);
--> statement-breakpoint
-- due_time / scheduled_for / priority は 20260425000000_item_priority_time_scheduled.sql で
-- 手書き追加済 (Drizzle snapshot が遅れて再 ADD を生成したので削除)
ALTER TABLE "items" ADD COLUMN "sprint_id" uuid;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sprints_workspace_status_idx" ON "sprints" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "sprints_workspace_dates_idx" ON "sprints" USING btree ("workspace_id","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sprints_active_uniq" ON "sprints" USING btree ("workspace_id") WHERE status = 'active';--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- items_today_idx は 20260425000000_item_priority_time_scheduled.sql で作成済 (再生成 skip)
CREATE INDEX "items_sprint_idx" ON "items" USING btree ("workspace_id","sprint_id") WHERE sprint_id is not null and deleted_at is null;