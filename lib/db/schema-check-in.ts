// ─────────────────────────────────────────────────────────────
// Catalyst OS — Weekly Check-In Schema (Sprint 6.3B)
//
// SERVER-ONLY — never import from a Client Component.
//
// Tables:
//   weekly_check_ins  — one row per client per week
//
// Status lifecycle:
//   draft → submitted → in_review → reviewed
//   reviewed → in_review (explicit reopen only)
//
// RLS: clients SELECT/INSERT/UPDATE their own draft/submitted rows.
// Coach writes are server-side (service-role, bypasses RLS).
// ─────────────────────────────────────────────────────────────

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  numeric,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, coachingEnrollments } from "./schema";

// ─────────────────────────────────────────────────────────────
// ENUM
// ─────────────────────────────────────────────────────────────

export const weeklyCheckInStatusEnum = pgEnum("weekly_check_in_status", [
  "draft",
  "submitted",
  "in_review",
  "reviewed",
]);

// ─────────────────────────────────────────────────────────────
// TABLE — weekly_check_ins
//
// One row per (client, week_start_date) — the unique index
// uq_client_week_check_in enforces this at the DB level.
//
// week_start_date is always the Sunday of the client's check-in
// week. If the client has no configured check-in day, Sunday is
// the fallback (documented in check-in-service.ts).
//
// coach_response is visible to the client only after status
// transitions to 'reviewed'. The service layer enforces this;
// RLS does not distinguish fields within a policy.
//
// FK behavior:
//   client_id    → RESTRICT: check-in tied to client identity
//   enrollment_id → SET NULL: check-in preserved if enrollment ends
//   reviewed_by  → SET NULL: check-in preserved if coach archived
// ─────────────────────────────────────────────────────────────

export const weeklyCheckIns = pgTable(
  "weekly_check_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),

    // The Sunday of the week this check-in covers.
    weekStartDate: date("week_start_date").notNull(),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    status: weeklyCheckInStatusEnum("status").notNull().default("draft"),

    // ── Body ─────────────────────────────────────────────────
    bodyWeightLbs: numeric("body_weight_lbs", { precision: 6, scale: 1 }),
    waistInches: numeric("waist_inches", { precision: 5, scale: 1 }),

    // ── Recovery ─────────────────────────────────────────────
    averageSleepHours: numeric("average_sleep_hours", { precision: 4, scale: 1 }),
    averageStress: integer("average_stress"),   // 1–10
    averageEnergy: integer("average_energy"),   // 1–10
    averageHunger: integer("average_hunger"),   // 1–10
    digestionRating: integer("digestion_rating"), // 1–10

    // ── Habits ───────────────────────────────────────────────
    averageWaterOunces: integer("average_water_ounces"),
    averageSteps: integer("average_steps"),
    workoutCompliancePct: integer("workout_compliance_pct"),  // 0–100
    nutritionCompliancePct: integer("nutrition_compliance_pct"), // 0–100

    // ── Reflection ───────────────────────────────────────────
    wins: text("wins"),
    challenges: text("challenges"),
    questions: text("questions"),
    clientNotes: text("client_notes"),

    // ── Coach response (coach-only writes; visible after reviewed) ──
    coachResponse: text("coach_response"),
    coachReviewedAt: timestamp("coach_reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Set only when the client edits the record after it was submitted.
    // Null means it was never edited post-submission. Coach draft saves
    // do NOT update this field, keeping client-edit provenance clean.
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Prevent duplicate check-ins for the same client/week
    uniqueIndex("uq_client_week_check_in").on(table.clientId, table.weekStartDate),

    index("idx_check_ins_client_id").on(table.clientId),
    index("idx_check_ins_status").on(table.status),
    index("idx_check_ins_submitted_at").on(table.submittedAt),
    index("idx_check_ins_reviewed_by").on(table.reviewedBy),
    index("idx_check_ins_enrollment_id").on(table.enrollmentId),

    // Rating range checks (1–10)
    check(
      "chk_check_in_stress",
      sql`${table.averageStress} IS NULL OR (${table.averageStress} >= 1 AND ${table.averageStress} <= 10)`,
    ),
    check(
      "chk_check_in_energy",
      sql`${table.averageEnergy} IS NULL OR (${table.averageEnergy} >= 1 AND ${table.averageEnergy} <= 10)`,
    ),
    check(
      "chk_check_in_hunger",
      sql`${table.averageHunger} IS NULL OR (${table.averageHunger} >= 1 AND ${table.averageHunger} <= 10)`,
    ),
    check(
      "chk_check_in_digestion",
      sql`${table.digestionRating} IS NULL OR (${table.digestionRating} >= 1 AND ${table.digestionRating} <= 10)`,
    ),

    // Compliance 0–100
    check(
      "chk_check_in_workout_compliance",
      sql`${table.workoutCompliancePct} IS NULL OR (${table.workoutCompliancePct} >= 0 AND ${table.workoutCompliancePct} <= 100)`,
    ),
    check(
      "chk_check_in_nutrition_compliance",
      sql`${table.nutritionCompliancePct} IS NULL OR (${table.nutritionCompliancePct} >= 0 AND ${table.nutritionCompliancePct} <= 100)`,
    ),

    // Non-negative continuous values
    check(
      "chk_check_in_sleep",
      sql`${table.averageSleepHours} IS NULL OR ${table.averageSleepHours} >= 0`,
    ),
    check(
      "chk_check_in_water",
      sql`${table.averageWaterOunces} IS NULL OR ${table.averageWaterOunces} >= 0`,
    ),
    check(
      "chk_check_in_steps",
      sql`${table.averageSteps} IS NULL OR ${table.averageSteps} >= 0`,
    ),

    // Positive-only when present
    check(
      "chk_check_in_weight",
      sql`${table.bodyWeightLbs} IS NULL OR ${table.bodyWeightLbs} > 0`,
    ),
    check(
      "chk_check_in_waist",
      sql`${table.waistInches} IS NULL OR ${table.waistInches} > 0`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// INFERRED TYPESCRIPT TYPES
// ─────────────────────────────────────────────────────────────

export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type NewWeeklyCheckIn = typeof weeklyCheckIns.$inferInsert;

export type WeeklyCheckInStatus =
  (typeof weeklyCheckInStatusEnum.enumValues)[number];
