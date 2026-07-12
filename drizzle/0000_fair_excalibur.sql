CREATE TYPE "public"."actor_role" AS ENUM('client', 'coach', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."coaching_package" AS ENUM('Standard', 'Founding Member', 'Legacy', 'Executive Performance');--> statement-breakpoint
CREATE TYPE "public"."created_or_reused" AS ENUM('created', 'reused');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('lead', 'pending_agreement', 'pending_payment', 'active', 'paused', 'cancelled', 'completed', 'upgraded');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('beginner', 'intermediate', 'advanced', 'competitive', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."external_provider" AS ENUM('stripe_customer', 'stripe_subscription', 'stripe_price', 'stripe_invoice', 'docusign_envelope', 'calendly_invitee', 'calendly_event', 'google_drive_folder', 'google_sheet_row');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('fat_loss', 'muscle_growth', 'body_recomposition', 'athletic_performance', 'lifestyle', 'competition_prep', 'executive_performance');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'coach', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"preferred_name" text,
	"date_of_birth" date,
	"phone" text,
	"address" text,
	"occupation" text,
	"emergency_contact" text,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"referral_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"specializations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_client_capacity" integer,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaching_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"package_type" "coaching_package" NOT NULL,
	"monthly_rate_cents" integer NOT NULL,
	"status" "enrollment_status" DEFAULT 'lead' NOT NULL,
	"start_date" date,
	"end_date" date,
	"paused_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"check_in_day_of_week" integer,
	"pipeline_stage" text DEFAULT 'Application Received' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_check_in_day_range" CHECK ("coaching_enrollments"."check_in_day_of_week" IS NULL OR ("coaching_enrollments"."check_in_day_of_week" >= 0 AND "coaching_enrollments"."check_in_day_of_week" <= 6))
);
--> statement-breakpoint
CREATE TABLE "drive_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"root_folder_id" text NOT NULL,
	"root_folder_url" text NOT NULL,
	"year_folder" text NOT NULL,
	"package_folder" text NOT NULL,
	"client_folder_name" text NOT NULL,
	"subfolder_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_or_reused" "created_or_reused" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"actor_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"enrollment_id" uuid,
	"provider" "external_provider" NOT NULL,
	"external_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_external_provider_id" UNIQUE("provider","external_id"),
	CONSTRAINT "chk_external_must_have_reference" CHECK ("external_identities"."user_id" IS NOT NULL OR "external_identities"."enrollment_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "program_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" "template_category" NOT NULL,
	"experience_level" "experience_level" NOT NULL,
	"recommended_days_per_week" integer,
	"default_duration_weeks" integer,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"parent_template_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"event_type" text NOT NULL,
	"actor_id" uuid,
	"actor_role" "actor_role" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"primary_focus" text,
	"recommended_experience_level" "experience_level" NOT NULL,
	"estimated_duration_minutes" integer,
	"recommended_equipment" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"parent_template_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_enrollments" ADD CONSTRAINT "coaching_enrollments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_enrollments" ADD CONSTRAINT "coaching_enrollments_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_workspaces" ADD CONSTRAINT "drive_workspaces_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_workspaces" ADD CONSTRAINT "drive_workspaces_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_events" ADD CONSTRAINT "enrollment_events_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_events" ADD CONSTRAINT "enrollment_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_templates" ADD CONSTRAINT "program_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_templates" ADD CONSTRAINT "program_templates_parent_template_id_program_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."program_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_enrollment_id_coaching_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."coaching_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_parent_template_id_workout_templates_id_fk" FOREIGN KEY ("parent_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_enrollments_client_id" ON "coaching_enrollments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_coach_id" ON "coaching_enrollments" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_status" ON "coaching_enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_enrollments_package_type" ON "coaching_enrollments" USING btree ("package_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_drive_workspace_enrollment" ON "drive_workspaces" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_drive_workspaces_client_id" ON "drive_workspaces" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_enrollment_events_enrollment_id" ON "enrollment_events" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_enrollment_events_event_type" ON "enrollment_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_enrollment_events_occurred_at" ON "enrollment_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_external_identities_user_id" ON "external_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_external_identities_enrollment_id" ON "external_identities" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_external_identities_provider" ON "external_identities" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_program_template_slug" ON "program_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_program_templates_status" ON "program_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_program_templates_category" ON "program_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_program_templates_experience" ON "program_templates" USING btree ("experience_level");--> statement-breakpoint
CREATE INDEX "idx_program_templates_parent" ON "program_templates" USING btree ("parent_template_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_client_occurred" ON "timeline_events" USING btree ("client_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_timeline_enrollment_id" ON "timeline_events" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_event_type" ON "timeline_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_normalized_email" ON "users" USING btree ("normalized_email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_workout_template_slug" ON "workout_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_status" ON "workout_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_experience" ON "workout_templates" USING btree ("recommended_experience_level");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_parent" ON "workout_templates" USING btree ("parent_template_id");