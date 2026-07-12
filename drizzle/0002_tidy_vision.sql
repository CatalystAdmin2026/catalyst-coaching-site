CREATE TYPE "public"."biological_sex" AS ENUM('female', 'male', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."body_comp_source" AS ENUM('onboarding', 'check_in', 'coach_entry', 'device', 'migration');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'paused', 'abandoned', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('fat_loss', 'muscle_gain', 'body_recomposition', 'strength', 'athletic_performance', 'general_health', 'mobility', 'competition_prep', 'reverse_diet', 'maintenance', 'executive_performance', 'custom');--> statement-breakpoint
CREATE TYPE "public"."gym_environment" AS ENUM('commercial_gym', 'home_gym', 'apartment_gym', 'outdoors', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."injury_side" AS ENUM('left', 'right', 'bilateral', 'midline', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."injury_status" AS ENUM('active', 'improving', 'resolved', 'chronic', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."submission_source" AS ENUM('google_sheets', 'portal', 'admin', 'migration');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('received', 'processed', 'failed', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('standard', 'executive', 'update');--> statement-breakpoint
CREATE TABLE "body_composition_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"weight_pounds" numeric,
	"body_fat_percent" numeric,
	"lean_mass_pounds" numeric,
	"fat_mass_pounds" numeric,
	"waist_inches" numeric,
	"hips_inches" numeric,
	"chest_inches" numeric,
	"thigh_left_inches" numeric,
	"thigh_right_inches" numeric,
	"arm_left_inches" numeric,
	"arm_right_inches" numeric,
	"measurement_method" text,
	"source" "body_comp_source" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"goal_type" "goal_type" NOT NULL,
	"description" text NOT NULL,
	"priority" integer,
	"target_value" numeric,
	"target_unit" text,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"started_at" date,
	"completed_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_preferences" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"communication_preference" text,
	"preferred_check_in_day" integer,
	"preferred_check_in_time" text,
	"accountability_style" text,
	"coaching_tone" text,
	"reminder_preference" jsonb,
	"notification_preference" jsonb,
	"accessibility_needs" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_preferred_check_in_day_range" CHECK ("client_preferences"."preferred_check_in_day" IS NULL OR ("client_preferences"."preferred_check_in_day" >= 0 AND "client_preferences"."preferred_check_in_day" <= 6))
);
--> statement-breakpoint
CREATE TABLE "equipment_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"equipment_type" text NOT NULL,
	"equipment_name" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"location_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_health_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"enrollment_id" uuid,
	"primary_physician" text,
	"registered_dietitian" text,
	"bloodwork_available" boolean DEFAULT false NOT NULL,
	"bloodwork_last_updated_at" date,
	"biomarkers_summary" jsonb,
	"medical_nutrition_therapy_required" boolean DEFAULT false NOT NULL,
	"physician_clearance_required" boolean DEFAULT false NOT NULL,
	"physician_clearance_status" text,
	"data_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"onboarding_submission_id" uuid,
	"height_inches" numeric,
	"biological_sex" "biological_sex",
	"date_of_birth" date,
	"current_medications" text,
	"diagnosed_conditions" text,
	"surgical_history" text,
	"physician_restrictions" text,
	"pregnancy_status" text,
	"sleep_hours_average" numeric,
	"stress_level" integer,
	"smoking_status" text,
	"alcohol_frequency" text,
	"medical_clearance_required" boolean DEFAULT false NOT NULL,
	"medical_clearance_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_health_stress_level_range" CHECK ("health_profiles"."stress_level" IS NULL OR ("health_profiles"."stress_level" >= 1 AND "health_profiles"."stress_level" <= 10))
);
--> statement-breakpoint
CREATE TABLE "injuries_limitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"body_region" text NOT NULL,
	"condition_name" text,
	"description" text NOT NULL,
	"side" "injury_side",
	"severity" integer,
	"status" "injury_status" DEFAULT 'unknown' NOT NULL,
	"diagnosed_by_professional" boolean,
	"exercise_restrictions" text,
	"pain_triggers" text,
	"safe_movements" text,
	"coach_notes" text,
	"occurred_at" date,
	"resolved_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_injury_severity_range" CHECK ("injuries_limitations"."severity" IS NULL OR ("injuries_limitations"."severity" >= 1 AND "injuries_limitations"."severity" <= 10))
);
--> statement-breakpoint
CREATE TABLE "nutrition_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"current_meals_per_day" integer,
	"preferred_meals_per_day" integer,
	"dietary_pattern" text,
	"allergies" jsonb,
	"intolerances" jsonb,
	"foods_liked" jsonb,
	"foods_disliked" jsonb,
	"foods_avoided" jsonb,
	"preferred_protein_sources" jsonb,
	"preferred_carb_sources" jsonb,
	"preferred_fat_sources" jsonb,
	"cooking_skill_level" text,
	"cooking_time_available" text,
	"meal_prep_frequency" text,
	"restaurant_frequency" text,
	"food_budget" text,
	"hydration_ounces_average" numeric,
	"calorie_tracking_experience" text,
	"eating_schedule" text,
	"fasting_preference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"submission_type" "submission_type" NOT NULL,
	"source" "submission_source" NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"status" "submission_status" DEFAULT 'received' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"experience_level" "experience_level",
	"years_training" numeric,
	"available_days_per_week" integer,
	"preferred_training_days" jsonb,
	"session_duration_minutes" integer,
	"preferred_training_time" text,
	"current_training_split" text,
	"exercise_likes" jsonb,
	"exercise_dislikes" jsonb,
	"movement_confidence" jsonb,
	"cardio_preference" text,
	"mobility_needs" text,
	"recovery_capacity" text,
	"gym_environment" "gym_environment",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_available_days_range" CHECK ("training_profiles"."available_days_per_week" IS NULL OR ("training_profiles"."available_days_per_week" >= 1 AND "training_profiles"."available_days_per_week" <= 7))
);
--> statement-breakpoint
ALTER TABLE "body_composition_records" ADD CONSTRAINT "body_composition_records_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_preferences" ADD CONSTRAINT "client_preferences_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_access" ADD CONSTRAINT "equipment_access_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_health_profiles" ADD CONSTRAINT "executive_health_profiles_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_health_profiles" ADD CONSTRAINT "executive_health_profiles_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_onboarding_submission_id_onboarding_submissions_id_fk" FOREIGN KEY ("onboarding_submission_id") REFERENCES "public"."onboarding_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injuries_limitations" ADD CONSTRAINT "injuries_limitations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_profiles" ADD CONSTRAINT "nutrition_profiles_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_profiles" ADD CONSTRAINT "training_profiles_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_body_comp_client_recorded" ON "body_composition_records" USING btree ("client_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_body_comp_client_id" ON "body_composition_records" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_goals_client_id" ON "client_goals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_goals_status" ON "client_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_client_goals_enrollment_id" ON "client_goals" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_client_goals_goal_type" ON "client_goals" USING btree ("goal_type");--> statement-breakpoint
CREATE INDEX "idx_equipment_client_id" ON "equipment_access" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_equipment_available" ON "equipment_access" USING btree ("client_id","available");--> statement-breakpoint
CREATE INDEX "idx_exec_health_enrollment_id" ON "executive_health_profiles" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_injuries_client_id" ON "injuries_limitations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_injuries_status" ON "injuries_limitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_injuries_body_region" ON "injuries_limitations" USING btree ("body_region");--> statement-breakpoint
CREATE INDEX "idx_submissions_client_id" ON "onboarding_submissions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_submitted_at" ON "onboarding_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_submissions_status" ON "onboarding_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_submissions_enrollment_id" ON "onboarding_submissions" USING btree ("enrollment_id");--> statement-breakpoint
-- ── Row Level Security ─────────────────────────────────────────────────────
-- Enable RLS on all 10 new tables.
-- Server-only tables (no client policies): onboarding_submissions,
-- health_profiles, injuries_limitations, executive_health_profiles.
-- Client-readable tables (SELECT own rows only): client_goals,
-- training_profiles, equipment_access, nutrition_profiles,
-- body_composition_records, client_preferences.
-- No INSERT/UPDATE/DELETE browser policies in this sprint.
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.injuries_limitations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.training_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.equipment_access ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.body_composition_records ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.executive_health_profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- SELECT policies for client-readable tables
CREATE POLICY "client_goals_select_own"
  ON public.client_goals FOR SELECT TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "training_profiles_select_own"
  ON public.training_profiles FOR SELECT TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "equipment_access_select_own"
  ON public.equipment_access FOR SELECT TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "nutrition_profiles_select_own"
  ON public.nutrition_profiles FOR SELECT TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "body_comp_records_select_own"
  ON public.body_composition_records FOR SELECT TO authenticated
  USING (auth.uid() = client_id);--> statement-breakpoint
CREATE POLICY "client_preferences_select_own"
  ON public.client_preferences FOR SELECT TO authenticated
  USING (auth.uid() = client_id);