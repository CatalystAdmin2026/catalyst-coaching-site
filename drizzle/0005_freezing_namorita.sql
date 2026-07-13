CREATE TYPE "public"."client_program_status" AS ENUM('active', 'inactive', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workout_session_status" AS ENUM('in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TABLE "client_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"program_template_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "client_program_status" DEFAULT 'active' NOT NULL,
	"override_allow_multiple" boolean DEFAULT false NOT NULL,
	"coach_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_week_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_week_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"workout_template_id" uuid,
	"label" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_day_of_week_range" CHECK ("program_week_days"."day_of_week" >= 0 AND "program_week_days"."day_of_week" <= 6)
);
--> statement-breakpoint
CREATE TABLE "program_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_template_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"label" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_week_number_positive" CHECK ("program_weeks"."week_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"client_program_id" uuid,
	"workout_template_id" uuid NOT NULL,
	"program_week_number" integer,
	"program_day_of_week" integer,
	"scheduled_date" date,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "workout_session_status" DEFAULT 'in_progress' NOT NULL,
	"completion_percent" integer DEFAULT 0 NOT NULL,
	"workout_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_session_completion_percent" CHECK ("workout_sessions"."completion_percent" >= 0 AND "workout_sessions"."completion_percent" <= 100),
	CONSTRAINT "chk_session_day_of_week" CHECK ("workout_sessions"."program_day_of_week" IS NULL OR ("workout_sessions"."program_day_of_week" >= 0 AND "workout_sessions"."program_day_of_week" <= 6)),
	CONSTRAINT "chk_session_completed_at" CHECK ("workout_sessions"."status" != 'completed' OR "workout_sessions"."completed_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "workout_set_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"workout_template_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actual_reps" integer,
	"actual_weight_kg" numeric(7, 2),
	"actual_duration_seconds" integer,
	"actual_rpe" numeric(3, 1),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_set_number_positive" CHECK ("workout_set_logs"."set_number" >= 1),
	CONSTRAINT "chk_actual_rpe" CHECK ("workout_set_logs"."actual_rpe" IS NULL OR ("workout_set_logs"."actual_rpe" >= 0 AND "workout_set_logs"."actual_rpe" <= 10)),
	CONSTRAINT "chk_actual_reps_nonneg" CHECK ("workout_set_logs"."actual_reps" IS NULL OR "workout_set_logs"."actual_reps" >= 0),
	CONSTRAINT "chk_actual_weight_nonneg" CHECK ("workout_set_logs"."actual_weight_kg" IS NULL OR "workout_set_logs"."actual_weight_kg" >= 0),
	CONSTRAINT "chk_actual_duration_nonneg" CHECK ("workout_set_logs"."actual_duration_seconds" IS NULL OR "workout_set_logs"."actual_duration_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "client_programs" ADD CONSTRAINT "client_programs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_programs" ADD CONSTRAINT "client_programs_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_programs" ADD CONSTRAINT "client_programs_program_template_id_program_templates_id_fk" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_week_days" ADD CONSTRAINT "program_week_days_program_week_id_program_weeks_id_fk" FOREIGN KEY ("program_week_id") REFERENCES "public"."program_weeks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_week_days" ADD CONSTRAINT "program_week_days_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_program_template_id_program_templates_id_fk" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_client_program_id_client_programs_id_fk" FOREIGN KEY ("client_program_id") REFERENCES "public"."client_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set_logs" ADD CONSTRAINT "workout_set_logs_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set_logs" ADD CONSTRAINT "workout_set_logs_workout_template_exercise_id_workout_template_exercises_id_fk" FOREIGN KEY ("workout_template_exercise_id") REFERENCES "public"."workout_template_exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_active_program" ON "client_programs" USING btree ("client_id") WHERE "client_programs"."status" = 'active' AND "client_programs"."override_allow_multiple" = false;--> statement-breakpoint
CREATE INDEX "idx_client_programs_client_id" ON "client_programs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_programs_enrollment_id" ON "client_programs" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_client_programs_template_id" ON "client_programs" USING btree ("program_template_id");--> statement-breakpoint
CREATE INDEX "idx_client_programs_status" ON "client_programs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_program_week_day" ON "program_week_days" USING btree ("program_week_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_program_week_days_week_id" ON "program_week_days" USING btree ("program_week_id");--> statement-breakpoint
CREATE INDEX "idx_program_week_days_workout_template" ON "program_week_days" USING btree ("workout_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_program_week" ON "program_weeks" USING btree ("program_template_id","week_number");--> statement-breakpoint
CREATE INDEX "idx_program_weeks_template_id" ON "program_weeks" USING btree ("program_template_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_client_id" ON "workout_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_program_id" ON "workout_sessions" USING btree ("client_program_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_template_id" ON "workout_sessions" USING btree ("workout_template_id");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_scheduled_date" ON "workout_sessions" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_workout_sessions_status" ON "workout_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_set_log" ON "workout_set_logs" USING btree ("workout_session_id","workout_template_exercise_id","set_number");--> statement-breakpoint
CREATE INDEX "idx_set_logs_session_id" ON "workout_set_logs" USING btree ("workout_session_id");--> statement-breakpoint
CREATE INDEX "idx_set_logs_exercise_id" ON "workout_set_logs" USING btree ("workout_template_exercise_id");--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────
-- RLS — Row Level Security for Sprint 6.0 tables
--
-- Deny-by-default: program_weeks and program_week_days are
-- coach-managed blueprint tables. Enabling RLS with no policies
-- denies all browser access. Coaches write through trusted
-- server routes that use the service-role connection.
--
-- Client SELECT policies: client_programs, workout_sessions, and
-- workout_set_logs allow authenticated users to read their own
-- data. All INSERT/UPDATE/DELETE goes through trusted server
-- routes (service role bypasses RLS).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "program_weeks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program_week_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_set_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "client_programs_client_select"
  ON "client_programs"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "workout_sessions_client_select"
  ON "workout_sessions"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "workout_set_logs_client_select"
  ON "workout_set_logs"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = workout_set_logs.workout_session_id
        AND ws.client_id = auth.uid()
    )
  );