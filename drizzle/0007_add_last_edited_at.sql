-- ─────────────────────────────────────────────────────────────
-- Sprint 6.4 QA Enhancement — Add last_edited_at to weekly_check_ins
--
-- Tracks when a client last edited a submitted check-in.
-- Null means the check-in was never edited after submission.
--
-- Risk profile: purely additive (ADD COLUMN), nullable column,
-- no DEFAULT required, no data backfill, no index needed.
-- All existing rows will have last_edited_at = NULL.
-- PostgreSQL 11+ ADD COLUMN for a nullable column without a
-- volatile DEFAULT is metadata-only — zero table rewrite,
-- no downtime, no lock escalation risk.
--
-- DO NOT APPLY until explicitly approved in this conversation.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "weekly_check_ins"
  ADD COLUMN "last_edited_at" timestamp with time zone;
