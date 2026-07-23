-- ─────────────────────────────────────────────────────────────
-- Catalyst OS — Copy-on-Assignment Migration (Sprint 6.X)
--
-- Implements Option B architecture: program assignment creates
-- client-owned structural copies of program weeks and day slots.
-- Template edits no longer affect assigned client programs.
--
-- Run:
--   node_modules/.bin/tsx --env-file=.env.local scripts/migrate.ts \
--     drizzle/0008_copy_on_assignment.sql
--
-- Risk profile:
--   - Purely additive: new tables + nullable columns on client_programs
--   - No existing rows modified
--   - No downtime required
--   - Backfill script must run BEFORE deploying updated service code
-- ─────────────────────────────────────────────────────────────

-- Add lineage snapshot columns to client_programs.
-- Both nullable — existing rows are back-filled by the accompanying script.
ALTER TABLE "client_programs"
  ADD COLUMN "source_template_name" text,
  ADD COLUMN "source_template_version" integer;
--> statement-breakpoint

-- ── TABLE: client_program_weeks ────────────────────────────────
-- Client-owned copy of program week structure, independent from
-- program_weeks after assignment.
CREATE TABLE "client_program_weeks" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_program_id"   uuid        NOT NULL
                          REFERENCES "client_programs"("id") ON DELETE RESTRICT,
  "source_week_id"      uuid
                          REFERENCES "program_weeks"("id") ON DELETE SET NULL,
  "week_number"         integer     NOT NULL,
  "label"               text,
  "notes"               text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_client_program_week"
    UNIQUE ("client_program_id", "week_number"),
  CONSTRAINT "chk_client_week_number_positive"
    CHECK ("week_number" >= 1)
);
--> statement-breakpoint

CREATE INDEX "idx_client_program_weeks_program_id"
  ON "client_program_weeks" ("client_program_id");
--> statement-breakpoint

CREATE INDEX "idx_client_program_weeks_source_week"
  ON "client_program_weeks" ("source_week_id");
--> statement-breakpoint

-- ── TABLE: client_program_week_days ───────────────────────────
-- Client-owned scheduling layer. workout_template_id references
-- the shared workout_templates — blueprints remain reusable.
CREATE TABLE "client_program_week_days" (
  "id"                       uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_program_week_id"   uuid        NOT NULL
                               REFERENCES "client_program_weeks"("id") ON DELETE RESTRICT,
  "source_day_id"            uuid
                               REFERENCES "program_week_days"("id") ON DELETE SET NULL,
  "day_of_week"              integer     NOT NULL,
  "workout_template_id"      uuid
                               REFERENCES "workout_templates"("id") ON DELETE RESTRICT,
  "label"                    text,
  "notes"                    text,
  "created_at"               timestamptz NOT NULL DEFAULT now(),
  "updated_at"               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_client_program_week_day"
    UNIQUE ("client_program_week_id", "day_of_week"),
  CONSTRAINT "chk_client_day_of_week_range"
    CHECK ("day_of_week" >= 0 AND "day_of_week" <= 6)
);
--> statement-breakpoint

CREATE INDEX "idx_client_program_week_days_week_id"
  ON "client_program_week_days" ("client_program_week_id");
--> statement-breakpoint

CREATE INDEX "idx_client_program_week_days_workout_template"
  ON "client_program_week_days" ("workout_template_id");
--> statement-breakpoint

CREATE INDEX "idx_client_program_week_days_source_day"
  ON "client_program_week_days" ("source_day_id");
