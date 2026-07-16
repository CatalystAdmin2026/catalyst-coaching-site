-- ─────────────────────────────────────────────────────────────
-- Sprint 6.3B — Weekly Check-In Schema
--
-- DO NOT APPLY until explicitly approved in conversation.
-- Dry-run first: npx tsx scripts/migrate.ts drizzle/0006_check_in_schema.sql --dry-run
--
-- Status lifecycle:
--   draft → submitted → in_review → reviewed
--   reviewed → in_review (explicit reopen only)
--
-- RLS:
--   clients  — SELECT own rows; INSERT own rows; UPDATE own draft/submitted rows
--   coaches  — all writes via service-role (bypasses RLS)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "public"."weekly_check_in_status" AS ENUM('draft', 'submitted', 'in_review', 'reviewed');--> statement-breakpoint
CREATE TABLE "weekly_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"week_start_date" date NOT NULL,
	"submitted_at" timestamp with time zone,
	"status" "weekly_check_in_status" DEFAULT 'draft' NOT NULL,
	"body_weight_lbs" numeric(6, 1),
	"waist_inches" numeric(5, 1),
	"average_sleep_hours" numeric(4, 1),
	"average_stress" integer,
	"average_energy" integer,
	"average_hunger" integer,
	"digestion_rating" integer,
	"average_water_ounces" integer,
	"average_steps" integer,
	"workout_compliance_pct" integer,
	"nutrition_compliance_pct" integer,
	"wins" text,
	"challenges" text,
	"questions" text,
	"client_notes" text,
	"coach_response" text,
	"coach_reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_check_in_stress" CHECK ("weekly_check_ins"."average_stress" IS NULL OR ("weekly_check_ins"."average_stress" >= 1 AND "weekly_check_ins"."average_stress" <= 10)),
	CONSTRAINT "chk_check_in_energy" CHECK ("weekly_check_ins"."average_energy" IS NULL OR ("weekly_check_ins"."average_energy" >= 1 AND "weekly_check_ins"."average_energy" <= 10)),
	CONSTRAINT "chk_check_in_hunger" CHECK ("weekly_check_ins"."average_hunger" IS NULL OR ("weekly_check_ins"."average_hunger" >= 1 AND "weekly_check_ins"."average_hunger" <= 10)),
	CONSTRAINT "chk_check_in_digestion" CHECK ("weekly_check_ins"."digestion_rating" IS NULL OR ("weekly_check_ins"."digestion_rating" >= 1 AND "weekly_check_ins"."digestion_rating" <= 10)),
	CONSTRAINT "chk_check_in_workout_compliance" CHECK ("weekly_check_ins"."workout_compliance_pct" IS NULL OR ("weekly_check_ins"."workout_compliance_pct" >= 0 AND "weekly_check_ins"."workout_compliance_pct" <= 100)),
	CONSTRAINT "chk_check_in_nutrition_compliance" CHECK ("weekly_check_ins"."nutrition_compliance_pct" IS NULL OR ("weekly_check_ins"."nutrition_compliance_pct" >= 0 AND "weekly_check_ins"."nutrition_compliance_pct" <= 100)),
	CONSTRAINT "chk_check_in_sleep" CHECK ("weekly_check_ins"."average_sleep_hours" IS NULL OR "weekly_check_ins"."average_sleep_hours" >= 0),
	CONSTRAINT "chk_check_in_water" CHECK ("weekly_check_ins"."average_water_ounces" IS NULL OR "weekly_check_ins"."average_water_ounces" >= 0),
	CONSTRAINT "chk_check_in_steps" CHECK ("weekly_check_ins"."average_steps" IS NULL OR "weekly_check_ins"."average_steps" >= 0),
	CONSTRAINT "chk_check_in_weight" CHECK ("weekly_check_ins"."body_weight_lbs" IS NULL OR "weekly_check_ins"."body_weight_lbs" > 0),
	CONSTRAINT "chk_check_in_waist" CHECK ("weekly_check_ins"."waist_inches" IS NULL OR "weekly_check_ins"."waist_inches" > 0)
);--> statement-breakpoint
ALTER TABLE "weekly_check_ins" ADD CONSTRAINT "weekly_check_ins_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_check_ins" ADD CONSTRAINT "weekly_check_ins_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_check_ins" ADD CONSTRAINT "weekly_check_ins_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_week_check_in" ON "weekly_check_ins" USING btree ("client_id","week_start_date");--> statement-breakpoint
CREATE INDEX "idx_check_ins_client_id" ON "weekly_check_ins" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_check_ins_status" ON "weekly_check_ins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_check_ins_submitted_at" ON "weekly_check_ins" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_check_ins_reviewed_by" ON "weekly_check_ins" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "idx_check_ins_enrollment_id" ON "weekly_check_ins" USING btree ("enrollment_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────
-- RLS — Row Level Security
--
-- Deny-by-default. All writes (client and coach) flow through
-- Next.js server actions that use the service-role connection,
-- which bypasses RLS entirely. RLS therefore serves as
-- defense-in-depth against direct Supabase PostgREST API calls.
--
-- Client policy:
--   SELECT  — own rows only
--
-- No INSERT or UPDATE policies are granted to authenticated.
-- Any direct PostgREST INSERT/UPDATE attempt from a browser
-- client will be denied by default (RLS deny-all for unlisted
-- operations). All mutations must go through server actions.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "weekly_check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "check_ins_client_select"
  ON "weekly_check_ins"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);
