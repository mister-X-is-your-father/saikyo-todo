CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"period" text DEFAULT 'quarterly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_actor_type" "actor_type" DEFAULT 'user' NOT NULL,
	"created_by_actor_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_dates_check" CHECK (start_date <= end_date),
	CONSTRAINT "goals_status_check" CHECK (status IN ('active', 'completed', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"progress_mode" text DEFAULT 'items' NOT NULL,
	"target_value" numeric(12, 2),
	"current_value" numeric(12, 2),
	"unit" text,
	"weight" smallint DEFAULT 1 NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "key_results_progress_mode_check" CHECK (progress_mode IN ('items', 'manual')),
	CONSTRAINT "key_results_weight_check" CHECK (weight BETWEEN 1 AND 10)
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "key_result_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_workspace_status_idx" ON "goals" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "key_results_goal_idx" ON "key_results" USING btree ("goal_id","position");--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."key_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_key_result_idx" ON "items" USING btree ("key_result_id") WHERE key_result_id is not null and deleted_at is null;