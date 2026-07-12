ALTER TYPE "public"."movement_pattern" ADD VALUE 'elbow_flexion';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'elbow_extension';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'shoulder_abduction';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'shoulder_adduction';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'knee_flexion';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'knee_extension';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'hip_extension';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'hip_flexion';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'scapular_retraction';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'scapular_depression';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'external_rotation';--> statement-breakpoint
ALTER TYPE "public"."movement_pattern" ADD VALUE 'internal_rotation';--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "resistance_type" "resistance_type";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exercise_cue_position" ON "exercise_cues" USING btree ("exercise_id","cue_type","order_index");