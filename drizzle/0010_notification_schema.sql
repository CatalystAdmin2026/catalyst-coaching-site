-- ─────────────────────────────────────────────────────────────
-- Catalyst OS — Notification Schema Migration
--
-- Introduces the client_notifications table for the coaching
-- event notification architecture (ADR-011).
--
-- Run:
--   node_modules/.bin/tsx --env-file=.env.local scripts/migrate.ts \
--     drizzle/0010_notification_schema.sql
--
-- Risk profile:
--   - Purely additive: one new enum, one new table
--   - No existing rows modified
--   - No downtime required
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "public"."notification_event_type" AS ENUM (
  'check_in_reviewed',
  'coach_responded',
  'program_updated',
  'nutrition_updated',
  'milestone_earned'
);
--> statement-breakpoint

CREATE TABLE "client_notifications" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id"     uuid        NOT NULL
                    REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_id"      uuid
                    REFERENCES "users"("id") ON DELETE SET NULL,
  "event_type"    "notification_event_type" NOT NULL,
  "resource_type" text,
  "resource_id"   uuid,
  "title"         text        NOT NULL,
  "body"          text,
  "read_at"       timestamptz,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "idx_notifications_client_id"
  ON "client_notifications" ("client_id");
--> statement-breakpoint

CREATE INDEX "idx_notifications_unread"
  ON "client_notifications" ("client_id", "read_at");
