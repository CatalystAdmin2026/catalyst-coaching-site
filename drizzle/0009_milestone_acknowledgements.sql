-- ─────────────────────────────────────────────────────────────
-- Catalyst OS — Milestone Acknowledgement Migration
--
-- Replaces localStorage-based milestone unlock tracking with a
-- server-side record. Acknowledgement is now account-scoped
-- (survives device/browser switches and future native apps)
-- rather than browser-scoped.
--
-- Run:
--   node_modules/.bin/tsx --env-file=.env.local scripts/migrate.ts \
--     drizzle/0009_milestone_acknowledgements.sql
--
-- Risk profile:
--   - Purely additive: one new table, no existing rows modified
--   - No downtime required
--   - On first deploy after migration: all clients will see
--     milestone unlock animations once (table is empty).
--     This is intentional and acceptable — clients see each
--     animation exactly once per earned milestone.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "client_milestone_acknowledgements" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id"        uuid        NOT NULL
                       REFERENCES "users"("id") ON DELETE CASCADE,
  "milestone_key"    text        NOT NULL,
  "acknowledged_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_client_milestone"
    UNIQUE ("client_id", "milestone_key")
);
--> statement-breakpoint

CREATE INDEX "idx_milestone_ack_client_id"
  ON "client_milestone_acknowledgements" ("client_id");
