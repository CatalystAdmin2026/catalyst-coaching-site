CREATE TYPE "public"."body_position" AS ENUM('standing', 'seated', 'lying_supine', 'lying_prone', 'incline', 'decline', 'kneeling', 'split_stance', 'hinge_position', 'quadruped', 'hanging');--> statement-breakpoint
CREATE TYPE "public"."contraindication_severity" AS ENUM('avoid', 'modify', 'monitor');--> statement-breakpoint
CREATE TYPE "public"."equipment_requirement" AS ENUM('required', 'optional', 'alternative');--> statement-breakpoint
CREATE TYPE "public"."exercise_classification" AS ENUM('compound', 'isolation', 'cardio', 'mobility', 'power', 'skill');--> statement-breakpoint
CREATE TYPE "public"."exercise_cue_type" AS ENUM('setup', 'breathing', 'execution', 'mental_cue', 'safety', 'common_error', 'correction', 'coaching_tip');--> statement-breakpoint
CREATE TYPE "public"."exercise_difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."exercise_media_type" AS ENUM('video_demo', 'technique_image', 'form_cue_image', 'anatomy_overlay', 'exercise_card');--> statement-breakpoint
CREATE TYPE "public"."exercise_relation_type" AS ENUM('regression', 'progression', 'substitute', 'lower_joint_stress', 'higher_joint_stress', 'same_pattern', 'contralateral');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('push_vertical', 'push_horizontal', 'pull_vertical', 'pull_horizontal', 'hip_hinge', 'squat_bilateral', 'squat_unilateral', 'lunge', 'carry', 'rotation', 'anti_rotation', 'gait', 'jump', 'throw', 'iso_hold');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'front_deltoid', 'lateral_deltoid', 'rear_deltoid', 'upper_back', 'lats', 'rhomboids', 'trapezius', 'triceps', 'biceps', 'brachialis', 'brachioradialis', 'forearms', 'rectus_abdominis', 'obliques', 'transverse_abdominis', 'spinal_erectors', 'multifidus', 'glutes', 'hip_flexors', 'adductors', 'abductors', 'quadriceps', 'hamstrings', 'calves', 'tibialis', 'cardiovascular');--> statement-breakpoint
CREATE TYPE "public"."muscle_role" AS ENUM('primary', 'secondary', 'stabilizer');--> statement-breakpoint
CREATE TYPE "public"."resistance_type" AS ENUM('barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'band', 'bodyweight', 'smith_machine', 'trap_bar', 'suspension', 'plate_loaded', 'medicine_ball', 'sandbag', 'chains', 'landmine');--> statement-breakpoint
CREATE TYPE "public"."set_technique" AS ENUM('straight_set', 'superset', 'triset', 'giant_set', 'drop_set', 'mechanical_drop_set', 'tension_drop_set', 'rest_pause', 'cluster_set', 'myo_reps', 'lengthened_partials', 'stretch_mediated_finisher', 'tempo_set', 'isometric', 'circuit');--> statement-breakpoint
CREATE TYPE "public"."substitution_policy" AS ENUM('strict', 'flexible', 'coach_review', 'no_substitute');--> statement-breakpoint
CREATE TYPE "public"."workout_section_type" AS ENUM('warmup', 'activation', 'potentiation', 'main_lift', 'accessory', 'conditioning', 'finisher', 'cooldown', 'rest_period');--> statement-breakpoint
CREATE TABLE "equipment_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"brand" text,
	"description" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_contraindications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"condition_or_injury" text NOT NULL,
	"body_region" text,
	"severity" "contraindication_severity" NOT NULL,
	"modification_note" text,
	"suggested_relation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_cues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"cue_type" "exercise_cue_type" NOT NULL,
	"content" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"equipment_catalog_id" uuid NOT NULL,
	"requirement_type" "equipment_requirement" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"media_type" "exercise_media_type" NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_muscles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	"role" "muscle_role" NOT NULL,
	"emphasis_percent" numeric(5, 2),
	CONSTRAINT "chk_emphasis_percent" CHECK ("exercise_muscles"."emphasis_percent" IS NULL OR ("exercise_muscles"."emphasis_percent" >= 0 AND "exercise_muscles"."emphasis_percent" <= 100))
);
--> statement-breakpoint
CREATE TABLE "exercise_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_exercise_id" uuid NOT NULL,
	"target_exercise_id" uuid NOT NULL,
	"relation_type" "exercise_relation_type" NOT NULL,
	"substitution_policy" "substitution_policy",
	"suitability_score" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_suitability_score" CHECK ("exercise_relations"."suitability_score" IS NULL OR ("exercise_relations"."suitability_score" >= 1 AND "exercise_relations"."suitability_score" <= 100)),
	CONSTRAINT "chk_no_self_relation" CHECK ("exercise_relations"."source_exercise_id" != "exercise_relations"."target_exercise_id")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"alternate_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"movement_pattern" "movement_pattern" NOT NULL,
	"classification" "exercise_classification" NOT NULL,
	"difficulty" "exercise_difficulty" NOT NULL,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"parent_exercise_id" uuid,
	"unilateral" boolean DEFAULT false NOT NULL,
	"alternating" boolean DEFAULT false NOT NULL,
	"is_time_based" boolean DEFAULT false NOT NULL,
	"is_distance_based" boolean DEFAULT false NOT NULL,
	"is_cardio" boolean DEFAULT false NOT NULL,
	"is_mobility" boolean DEFAULT false NOT NULL,
	"fatigue_cost" integer,
	"technical_complexity" integer,
	"stability_demand" integer,
	"joint_stress_shoulder" integer,
	"joint_stress_elbow" integer,
	"joint_stress_wrist" integer,
	"joint_stress_spine" integer,
	"joint_stress_hip" integer,
	"joint_stress_knee" integer,
	"joint_stress_ankle" integer,
	"lengthened_bias" integer,
	"shortened_bias" integer,
	"stretch_mediated_potential" integer,
	"default_body_position" "body_position",
	"default_notes" text,
	"coach_created" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_exercise_fatigue_cost" CHECK ("exercises"."fatigue_cost" IS NULL OR ("exercises"."fatigue_cost" >= 1 AND "exercises"."fatigue_cost" <= 10)),
	CONSTRAINT "chk_exercise_technical_complexity" CHECK ("exercises"."technical_complexity" IS NULL OR ("exercises"."technical_complexity" >= 1 AND "exercises"."technical_complexity" <= 10)),
	CONSTRAINT "chk_exercise_stability_demand" CHECK ("exercises"."stability_demand" IS NULL OR ("exercises"."stability_demand" >= 1 AND "exercises"."stability_demand" <= 10)),
	CONSTRAINT "chk_joint_stress_shoulder" CHECK ("exercises"."joint_stress_shoulder" IS NULL OR ("exercises"."joint_stress_shoulder" >= 0 AND "exercises"."joint_stress_shoulder" <= 10)),
	CONSTRAINT "chk_joint_stress_elbow" CHECK ("exercises"."joint_stress_elbow" IS NULL OR ("exercises"."joint_stress_elbow" >= 0 AND "exercises"."joint_stress_elbow" <= 10)),
	CONSTRAINT "chk_joint_stress_wrist" CHECK ("exercises"."joint_stress_wrist" IS NULL OR ("exercises"."joint_stress_wrist" >= 0 AND "exercises"."joint_stress_wrist" <= 10)),
	CONSTRAINT "chk_joint_stress_spine" CHECK ("exercises"."joint_stress_spine" IS NULL OR ("exercises"."joint_stress_spine" >= 0 AND "exercises"."joint_stress_spine" <= 10)),
	CONSTRAINT "chk_joint_stress_hip" CHECK ("exercises"."joint_stress_hip" IS NULL OR ("exercises"."joint_stress_hip" >= 0 AND "exercises"."joint_stress_hip" <= 10)),
	CONSTRAINT "chk_joint_stress_knee" CHECK ("exercises"."joint_stress_knee" IS NULL OR ("exercises"."joint_stress_knee" >= 0 AND "exercises"."joint_stress_knee" <= 10)),
	CONSTRAINT "chk_joint_stress_ankle" CHECK ("exercises"."joint_stress_ankle" IS NULL OR ("exercises"."joint_stress_ankle" >= 0 AND "exercises"."joint_stress_ankle" <= 10)),
	CONSTRAINT "chk_exercise_lengthened_bias" CHECK ("exercises"."lengthened_bias" IS NULL OR ("exercises"."lengthened_bias" >= 0 AND "exercises"."lengthened_bias" <= 10)),
	CONSTRAINT "chk_exercise_shortened_bias" CHECK ("exercises"."shortened_bias" IS NULL OR ("exercises"."shortened_bias" >= 0 AND "exercises"."shortened_bias" <= 10)),
	CONSTRAINT "chk_exercise_smp" CHECK ("exercises"."stretch_mediated_potential" IS NULL OR ("exercises"."stretch_mediated_potential" >= 0 AND "exercises"."stretch_mediated_potential" <= 10))
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_template_id" uuid NOT NULL,
	"section_id" uuid,
	"exercise_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"group_id" uuid,
	"group_position" integer,
	"sets" integer,
	"reps_min" integer,
	"reps_max" integer,
	"duration_seconds" integer,
	"distance_meters" numeric(8, 2),
	"rest_seconds" integer,
	"tempo" text,
	"target_rpe" numeric(3, 1),
	"target_rir" numeric(3, 1),
	"set_technique" "set_technique",
	"substitution_policy" "substitution_policy",
	"is_required" boolean DEFAULT true NOT NULL,
	"coach_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_reps_min_max" CHECK ("workout_template_exercises"."reps_min" IS NULL OR "workout_template_exercises"."reps_max" IS NULL OR "workout_template_exercises"."reps_min" <= "workout_template_exercises"."reps_max"),
	CONSTRAINT "chk_target_rpe" CHECK ("workout_template_exercises"."target_rpe" IS NULL OR ("workout_template_exercises"."target_rpe" >= 0 AND "workout_template_exercises"."target_rpe" <= 10)),
	CONSTRAINT "chk_target_rir" CHECK ("workout_template_exercises"."target_rir" IS NULL OR "workout_template_exercises"."target_rir" >= 0),
	CONSTRAINT "chk_sets_positive" CHECK ("workout_template_exercises"."sets" IS NULL OR "workout_template_exercises"."sets" > 0),
	CONSTRAINT "chk_rest_seconds_nonneg" CHECK ("workout_template_exercises"."rest_seconds" IS NULL OR "workout_template_exercises"."rest_seconds" >= 0),
	CONSTRAINT "chk_group_position_positive" CHECK ("workout_template_exercises"."group_position" IS NULL OR "workout_template_exercises"."group_position" >= 1)
);
--> statement-breakpoint
CREATE TABLE "workout_template_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"section_type" "workout_section_type" NOT NULL,
	"order_index" integer NOT NULL,
	"estimated_minutes" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_templates" ADD COLUMN "template_family_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "template_family_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "objective" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "coaching_methodology" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "default_set_style" text;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "minimum_days_per_week" integer;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN "maximum_days_per_week" integer;--> statement-breakpoint
ALTER TABLE "exercise_contraindications" ADD CONSTRAINT "exercise_contraindications_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_contraindications" ADD CONSTRAINT "exercise_contraindications_suggested_relation_id_exercise_relations_id_fk" FOREIGN KEY ("suggested_relation_id") REFERENCES "public"."exercise_relations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_cues" ADD CONSTRAINT "exercise_cues_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipment_catalog_id_equipment_catalog_id_fk" FOREIGN KEY ("equipment_catalog_id") REFERENCES "public"."equipment_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_relations" ADD CONSTRAINT "exercise_relations_source_exercise_id_exercises_id_fk" FOREIGN KEY ("source_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_relations" ADD CONSTRAINT "exercise_relations_target_exercise_id_exercises_id_fk" FOREIGN KEY ("target_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_parent_exercise_id_exercises_id_fk" FOREIGN KEY ("parent_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_section_id_workout_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."workout_template_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_sections" ADD CONSTRAINT "workout_template_sections_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_equipment_slug" ON "equipment_catalog" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_equipment_catalog_category" ON "equipment_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_exercise_contraindications_exercise_id" ON "exercise_contraindications" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_contraindications_severity" ON "exercise_contraindications" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_exercise_contraindications_body_region" ON "exercise_contraindications" USING btree ("body_region");--> statement-breakpoint
CREATE INDEX "idx_exercise_cues_exercise_id" ON "exercise_cues" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_cues_type" ON "exercise_cues" USING btree ("cue_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exercise_equipment_type" ON "exercise_equipment" USING btree ("exercise_id","equipment_catalog_id","requirement_type");--> statement-breakpoint
CREATE INDEX "idx_exercise_equipment_exercise_id" ON "exercise_equipment" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_equipment_catalog_id" ON "exercise_equipment" USING btree ("equipment_catalog_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_media_exercise_id" ON "exercise_media" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_media_type" ON "exercise_media" USING btree ("media_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exercise_muscle_role" ON "exercise_muscles" USING btree ("exercise_id","muscle_group","role");--> statement-breakpoint
CREATE INDEX "idx_exercise_muscles_exercise_id" ON "exercise_muscles" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_muscles_muscle_group" ON "exercise_muscles" USING btree ("muscle_group");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exercise_relation_type" ON "exercise_relations" USING btree ("source_exercise_id","target_exercise_id","relation_type");--> statement-breakpoint
CREATE INDEX "idx_exercise_relations_source" ON "exercise_relations" USING btree ("source_exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_relations_target" ON "exercise_relations" USING btree ("target_exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_relations_type" ON "exercise_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exercise_slug" ON "exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercises_status" ON "exercises" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_exercises_movement_pattern" ON "exercises" USING btree ("movement_pattern");--> statement-breakpoint
CREATE INDEX "idx_exercises_classification" ON "exercises" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "idx_exercises_difficulty" ON "exercises" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_exercises_parent" ON "exercises" USING btree ("parent_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_wte_order" ON "workout_template_exercises" USING btree ("workout_template_id","section_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_wte_template_id" ON "workout_template_exercises" USING btree ("workout_template_id");--> statement-breakpoint
CREATE INDEX "idx_wte_section_id" ON "workout_template_exercises" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_wte_exercise_id" ON "workout_template_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_wte_group_id" ON "workout_template_exercises" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_section_order" ON "workout_template_sections" USING btree ("workout_template_id","order_index");--> statement-breakpoint
CREATE INDEX "idx_wt_sections_template_id" ON "workout_template_sections" USING btree ("workout_template_id");--> statement-breakpoint
CREATE INDEX "idx_program_templates_family_id" ON "program_templates" USING btree ("template_family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_program_template_family_version" ON "program_templates" USING btree ("template_family_id","version");--> statement-breakpoint
CREATE INDEX "idx_workout_templates_family_id" ON "workout_templates" USING btree ("template_family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_workout_template_family_version" ON "workout_templates" USING btree ("template_family_id","version");--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "chk_workout_min_days_valid" CHECK ("workout_templates"."minimum_days_per_week" IS NULL OR ("workout_templates"."minimum_days_per_week" >= 1 AND "workout_templates"."minimum_days_per_week" <= 7));--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "chk_workout_max_days_valid" CHECK ("workout_templates"."maximum_days_per_week" IS NULL OR ("workout_templates"."maximum_days_per_week" >= 1 AND "workout_templates"."maximum_days_per_week" <= 7));--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "chk_workout_days_per_week" CHECK ("workout_templates"."minimum_days_per_week" IS NULL OR "workout_templates"."maximum_days_per_week" IS NULL OR "workout_templates"."minimum_days_per_week" <= "workout_templates"."maximum_days_per_week");--> statement-breakpoint
-- ── Row Level Security ─────────────────────────────────────────────────────
-- Enable RLS on all 10 new tables.
-- No client SELECT policies in Sprint 5C.1 — the exercise library is
-- server-only. Drizzle (direct Postgres) bypasses RLS on the server.
-- Client-facing access will be added in a future sprint via a view or
-- server-side helper that pre-filters prescriptions by assigned program.
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_relations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_cues ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.exercise_contraindications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.workout_template_sections ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;