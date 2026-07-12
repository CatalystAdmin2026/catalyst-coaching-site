// ─────────────────────────────────────────────────────────────
// Catalyst OS — Client Profile Schema (Sprint 5B.3)
//
// SERVER-ONLY — never import from a Client Component.
// Contains 10 tables for structured onboarding and coaching profiles.
// Additive only — no existing tables modified.
//
// Sensitive-data classification per table is documented in
// docs/catalyst-os-client-profile.md. Summary:
//   - onboarding_submissions  : server-only (raw payload)
//   - health_profiles         : server-only (all medical)
//   - injuries_limitations    : server-only (coachNotes mixed with client data)
//   - executive_health_profiles: admin/coach-only (biomarkers)
//   - All others              : client-readable via RLS SELECT policies
// ─────────────────────────────────────────────────────────────

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  boolean,
  numeric,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, coachingEnrollments, experienceLevelEnum } from "./schema";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export const submissionTypeEnum = pgEnum("submission_type", [
  "standard",
  "executive",
  "update",
]);

export const submissionSourceEnum = pgEnum("submission_source", [
  "google_sheets",
  "portal",
  "admin",
  "migration",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "received",
  "processed",
  "failed",
  "superseded",
]);

export const biologicalSexEnum = pgEnum("biological_sex", [
  "female",
  "male",
  "unspecified",
]);

export const injurySideEnum = pgEnum("injury_side", [
  "left",
  "right",
  "bilateral",
  "midline",
  "not_applicable",
]);

export const injuryStatusEnum = pgEnum("injury_status", [
  "active",
  "improving",
  "resolved",
  "chronic",
  "unknown",
]);

export const gymEnvironmentEnum = pgEnum("gym_environment", [
  "commercial_gym",
  "home_gym",
  "apartment_gym",
  "outdoors",
  "mixed",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "fat_loss",
  "muscle_gain",
  "body_recomposition",
  "strength",
  "athletic_performance",
  "general_health",
  "mobility",
  "competition_prep",
  "reverse_diet",
  "maintenance",
  "executive_performance",
  "custom",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "paused",
  "abandoned",
  "superseded",
]);

export const bodyCompSourceEnum = pgEnum("body_comp_source", [
  "onboarding",
  "check_in",
  "coach_entry",
  "device",
  "migration",
]);

// ─────────────────────────────────────────────────────────────
// TABLE 1 — onboarding_submissions
//
// Immutable record of each onboarding form submission.
// Append-only: never update or delete rows.
// rawPayload preserves the exact historical submission.
// SERVER-ONLY: rawPayload contains all collected fields.
// Do not expose to browser or add client RLS policies.
//
// FK behavior:
//   clientId     → RESTRICT : submission tied to client identity
//   enrollmentId → SET NULL : submission preserved if enrollment ends
// ─────────────────────────────────────────────────────────────

export const onboardingSubmissions = pgTable(
  "onboarding_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    submissionType: submissionTypeEnum("submission_type").notNull(),
    source: submissionSourceEnum("source").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: submissionStatusEnum("status").notNull().default("received"),
    processingError: text("processing_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_submissions_client_id").on(table.clientId),
    index("idx_submissions_submitted_at").on(table.submittedAt),
    index("idx_submissions_status").on(table.status),
    index("idx_submissions_enrollment_id").on(table.enrollmentId),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 2 — health_profiles
//
// One current structured health profile per client.
// Stores client-reported information only — not medical claims.
// SERVER-ONLY: contains medical conditions, medications, surgery
// history, and pregnancy status. No client RLS in this sprint.
//
// FK behavior:
//   clientId              → RESTRICT : health record tied to client
//   onboardingSubmissionId → SET NULL : profile persists if submission deleted
// ─────────────────────────────────────────────────────────────

export const healthProfiles = pgTable("health_profiles", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict" }),
  onboardingSubmissionId: uuid("onboarding_submission_id").references(
    () => onboardingSubmissions.id,
    { onDelete: "set null" },
  ),
  heightInches: numeric("height_inches"),
  biologicalSex: biologicalSexEnum("biological_sex"),
  dateOfBirth: date("date_of_birth"),
  currentMedications: text("current_medications"),
  diagnosedConditions: text("diagnosed_conditions"),
  surgicalHistory: text("surgical_history"),
  physicianRestrictions: text("physician_restrictions"),
  pregnancyStatus: text("pregnancy_status"),
  sleepHoursAverage: numeric("sleep_hours_average"),
  stressLevel: integer("stress_level"),
  smokingStatus: text("smoking_status"),
  alcoholFrequency: text("alcohol_frequency"),
  medicalClearanceRequired: boolean("medical_clearance_required")
    .notNull()
    .default(false),
  medicalClearanceReceivedAt: timestamp("medical_clearance_received_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
},
(table) => [
  check(
    "chk_health_stress_level_range",
    sql`${table.stressLevel} IS NULL OR (${table.stressLevel} >= 1 AND ${table.stressLevel} <= 10)`,
  ),
]);

// ─────────────────────────────────────────────────────────────
// TABLE 3 — client_goals
//
// Supports multiple concurrent goals and historical goal changes.
// Goals are never deleted — they are updated to superseded/achieved.
// CLIENT-READABLE via RLS SELECT policy (own goals only).
//
// FK behavior:
//   clientId     → RESTRICT : goals tied to client identity
//   enrollmentId → SET NULL : goals preserved if enrollment ends
// ─────────────────────────────────────────────────────────────

export const clientGoals = pgTable(
  "client_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    goalType: goalTypeEnum("goal_type").notNull(),
    description: text("description").notNull(),
    priority: integer("priority"),
    targetValue: numeric("target_value"),
    targetUnit: text("target_unit"),
    targetDate: date("target_date"),
    status: goalStatusEnum("status").notNull().default("active"),
    startedAt: date("started_at"),
    completedAt: date("completed_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_client_goals_client_id").on(table.clientId),
    index("idx_client_goals_status").on(table.status),
    index("idx_client_goals_enrollment_id").on(table.enrollmentId),
    index("idx_client_goals_goal_type").on(table.goalType),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 4 — injuries_limitations
//
// Injury and movement-limitation history per client.
// SERVER-ONLY because coachNotes is mixed with client-facing fields.
// Column-level RLS is not available in Postgres without views.
// Safer approach: keep the entire table server-only.
// Clients access relevant summaries through coach-curated content.
//
// FK behavior:
//   clientId → RESTRICT : injury record tied to client identity
// ─────────────────────────────────────────────────────────────

export const injuriesLimitations = pgTable(
  "injuries_limitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    bodyRegion: text("body_region").notNull(),
    conditionName: text("condition_name"),
    description: text("description").notNull(),
    side: injurySideEnum("side"),
    severity: integer("severity"),
    status: injuryStatusEnum("status").notNull().default("unknown"),
    diagnosedByProfessional: boolean("diagnosed_by_professional"),
    exerciseRestrictions: text("exercise_restrictions"),
    painTriggers: text("pain_triggers"),
    safeMovements: text("safe_movements"),
    coachNotes: text("coach_notes"),
    occurredAt: date("occurred_at"),
    resolvedAt: date("resolved_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_injuries_client_id").on(table.clientId),
    index("idx_injuries_status").on(table.status),
    index("idx_injuries_body_region").on(table.bodyRegion),
    check(
      "chk_injury_severity_range",
      sql`${table.severity} IS NULL OR (${table.severity} >= 1 AND ${table.severity} <= 10)`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 5 — training_profiles
//
// One current training profile per client.
// Reuses the existing experienceLevelEnum from Sprint 5B.1.
// CLIENT-READABLE via RLS SELECT policy.
//
// FK behavior:
//   clientId → RESTRICT
// ─────────────────────────────────────────────────────────────

export const trainingProfiles = pgTable(
  "training_profiles",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "restrict" }),
    experienceLevel: experienceLevelEnum("experience_level"),
    yearsTraining: numeric("years_training"),
    availableDaysPerWeek: integer("available_days_per_week"),
    preferredTrainingDays: jsonb("preferred_training_days"),
    sessionDurationMinutes: integer("session_duration_minutes"),
    preferredTrainingTime: text("preferred_training_time"),
    currentTrainingSplit: text("current_training_split"),
    exerciseLikes: jsonb("exercise_likes"),
    exerciseDislikes: jsonb("exercise_dislikes"),
    movementConfidence: jsonb("movement_confidence"),
    cardioPreference: text("cardio_preference"),
    mobilityNeeds: text("mobility_needs"),
    recoveryCapacity: text("recovery_capacity"),
    gymEnvironment: gymEnvironmentEnum("gym_environment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "chk_available_days_range",
      sql`${table.availableDaysPerWeek} IS NULL OR (${table.availableDaysPerWeek} >= 1 AND ${table.availableDaysPerWeek} <= 7)`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 6 — equipment_access
//
// Per-item equipment inventory for a client.
// Designed for future workout-generation substitution queries:
// filter exercises by client_id WHERE available = true.
// CLIENT-READABLE via RLS SELECT policy.
//
// FK behavior:
//   clientId → RESTRICT
// ─────────────────────────────────────────────────────────────

export const equipmentAccess = pgTable(
  "equipment_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    equipmentType: text("equipment_type").notNull(),
    equipmentName: text("equipment_name").notNull(),
    available: boolean("available").notNull().default(true),
    locationName: text("location_name"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_equipment_client_id").on(table.clientId),
    index("idx_equipment_available").on(table.clientId, table.available),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 7 — nutrition_profiles
//
// One current nutrition profile per client. Stores inputs only —
// no BMR, TDEE, calorie, or macro calculations in this sprint.
// CLIENT-READABLE via RLS SELECT policy.
//
// FK behavior:
//   clientId → RESTRICT
// ─────────────────────────────────────────────────────────────

export const nutritionProfiles = pgTable("nutrition_profiles", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict" }),
  currentMealsPerDay: integer("current_meals_per_day"),
  preferredMealsPerDay: integer("preferred_meals_per_day"),
  dietaryPattern: text("dietary_pattern"),
  allergies: jsonb("allergies"),
  intolerances: jsonb("intolerances"),
  foodsLiked: jsonb("foods_liked"),
  foodsDisliked: jsonb("foods_disliked"),
  foodsAvoided: jsonb("foods_avoided"),
  preferredProteinSources: jsonb("preferred_protein_sources"),
  preferredCarbSources: jsonb("preferred_carb_sources"),
  preferredFatSources: jsonb("preferred_fat_sources"),
  cookingSkillLevel: text("cooking_skill_level"),
  cookingTimeAvailable: text("cooking_time_available"),
  mealPrepFrequency: text("meal_prep_frequency"),
  restaurantFrequency: text("restaurant_frequency"),
  foodBudget: text("food_budget"),
  hydrationOuncesAverage: numeric("hydration_ounces_average"),
  calorieTrackingExperience: text("calorie_tracking_experience"),
  eatingSchedule: text("eating_schedule"),
  fastingPreference: text("fasting_preference"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// TABLE 8 — body_composition_records
//
// Append-only history of body composition measurements.
// Never overwrite historical measurements — only insert new rows.
// CLIENT-READABLE via RLS SELECT policy.
//
// FK behavior:
//   clientId → RESTRICT : measurements tied to client identity
// ─────────────────────────────────────────────────────────────

export const bodyCompositionRecords = pgTable(
  "body_composition_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    weightPounds: numeric("weight_pounds"),
    bodyFatPercent: numeric("body_fat_percent"),
    leanMassPounds: numeric("lean_mass_pounds"),
    fatMassPounds: numeric("fat_mass_pounds"),
    waistInches: numeric("waist_inches"),
    hipsInches: numeric("hips_inches"),
    chestInches: numeric("chest_inches"),
    thighLeftInches: numeric("thigh_left_inches"),
    thighRightInches: numeric("thigh_right_inches"),
    armLeftInches: numeric("arm_left_inches"),
    armRightInches: numeric("arm_right_inches"),
    measurementMethod: text("measurement_method"),
    source: bodyCompSourceEnum("source").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_body_comp_client_recorded").on(
      table.clientId,
      table.recordedAt,
    ),
    index("idx_body_comp_client_id").on(table.clientId),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 9 — executive_health_profiles
//
// Extended health profile for Executive Performance clients only.
// ADMIN/COACH-ONLY: biomarkersSummary contains sensitive health data.
// No client RLS in this sprint. Raw bloodwork files must NOT be
// stored in JSONB — use secure storage references in a future sprint.
//
// FK behavior:
//   clientId     → RESTRICT : profile tied to client identity
//   enrollmentId → SET NULL : profile preserved if enrollment ends
// ─────────────────────────────────────────────────────────────

export const executiveHealthProfiles = pgTable(
  "executive_health_profiles",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    primaryPhysician: text("primary_physician"),
    registeredDietitian: text("registered_dietitian"),
    bloodworkAvailable: boolean("bloodwork_available").notNull().default(false),
    bloodworkLastUpdatedAt: date("bloodwork_last_updated_at"),
    biomarkersSummary: jsonb("biomarkers_summary"),
    medicalNutritionTherapyRequired: boolean(
      "medical_nutrition_therapy_required",
    )
      .notNull()
      .default(false),
    physicianClearanceRequired: boolean("physician_clearance_required")
      .notNull()
      .default(false),
    physicianClearanceStatus: text("physician_clearance_status"),
    dataConsentAt: timestamp("data_consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_exec_health_enrollment_id").on(table.enrollmentId),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 10 — client_preferences
//
// Communication, check-in, and accessibility preferences.
// One current record per client.
// CLIENT-READABLE via RLS SELECT policy.
//
// Note: timezone here is client's stated preference from onboarding.
// The canonical timezone for scheduling is on client_profiles.timezone.
//
// FK behavior:
//   clientId → RESTRICT
// ─────────────────────────────────────────────────────────────

export const clientPreferences = pgTable(
  "client_preferences",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "restrict" }),
    communicationPreference: text("communication_preference"),
    preferredCheckInDay: integer("preferred_check_in_day"),
    preferredCheckInTime: text("preferred_check_in_time"),
    accountabilityStyle: text("accountability_style"),
    coachingTone: text("coaching_tone"),
    reminderPreference: jsonb("reminder_preference"),
    notificationPreference: jsonb("notification_preference"),
    accessibilityNeeds: text("accessibility_needs"),
    timezone: text("timezone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "chk_preferred_check_in_day_range",
      sql`${table.preferredCheckInDay} IS NULL OR (${table.preferredCheckInDay} >= 0 AND ${table.preferredCheckInDay} <= 6)`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// INFERRED TYPESCRIPT TYPES
// ─────────────────────────────────────────────────────────────

export type OnboardingSubmission = typeof onboardingSubmissions.$inferSelect;
export type NewOnboardingSubmission =
  typeof onboardingSubmissions.$inferInsert;

export type HealthProfile = typeof healthProfiles.$inferSelect;
export type NewHealthProfile = typeof healthProfiles.$inferInsert;

export type ClientGoal = typeof clientGoals.$inferSelect;
export type NewClientGoal = typeof clientGoals.$inferInsert;

export type InjuryLimitation = typeof injuriesLimitations.$inferSelect;
export type NewInjuryLimitation = typeof injuriesLimitations.$inferInsert;

export type TrainingProfile = typeof trainingProfiles.$inferSelect;
export type NewTrainingProfile = typeof trainingProfiles.$inferInsert;

export type EquipmentAccess = typeof equipmentAccess.$inferSelect;
export type NewEquipmentAccess = typeof equipmentAccess.$inferInsert;

export type NutritionProfile = typeof nutritionProfiles.$inferSelect;
export type NewNutritionProfile = typeof nutritionProfiles.$inferInsert;

export type BodyCompositionRecord = typeof bodyCompositionRecords.$inferSelect;
export type NewBodyCompositionRecord =
  typeof bodyCompositionRecords.$inferInsert;

export type ExecutiveHealthProfile =
  typeof executiveHealthProfiles.$inferSelect;
export type NewExecutiveHealthProfile =
  typeof executiveHealthProfiles.$inferInsert;

export type ClientPreference = typeof clientPreferences.$inferSelect;
export type NewClientPreference = typeof clientPreferences.$inferInsert;

// Enum value types
export type SubmissionType =
  (typeof submissionTypeEnum.enumValues)[number];
export type SubmissionSource =
  (typeof submissionSourceEnum.enumValues)[number];
export type SubmissionStatus =
  (typeof submissionStatusEnum.enumValues)[number];
export type BiologicalSex = (typeof biologicalSexEnum.enumValues)[number];
export type InjurySide = (typeof injurySideEnum.enumValues)[number];
export type InjuryStatus = (typeof injuryStatusEnum.enumValues)[number];
export type GymEnvironment = (typeof gymEnvironmentEnum.enumValues)[number];
export type GoalType = (typeof goalTypeEnum.enumValues)[number];
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];
export type BodyCompSource = (typeof bodyCompSourceEnum.enumValues)[number];
