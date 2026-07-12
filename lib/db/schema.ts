// ─────────────────────────────────────────────────────────────
// Catalyst OS — Database Schema
//
// SERVER-ONLY — never import this file from a client component.
// Defines the foundational Catalyst OS v1 data model using Drizzle ORM.
//
// Sprint 5B.1 tables (this file):
//   users, client_profiles, coach_profiles, coaching_enrollments,
//   external_identities, enrollment_events, timeline_events,
//   drive_workspaces, program_templates, workout_templates
//
// Future sprint additions — see docs/catalyst-os-data-foundation.md
// for the full planned schema sequence.
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
  unique,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core/columns/common";

// ─────────────────────────────────────────────────────────────
// POSTGRES ENUMS
// Native Postgres enum types — generated as CREATE TYPE in migrations.
// ─────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "client",
  "coach",
  "admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
  "archived",
]);

export const coachingPackageEnum = pgEnum("coaching_package", [
  "Standard",
  "Founding Member",
  "Legacy",
  "Executive Performance",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "lead",
  "pending_agreement",
  "pending_payment",
  "active",
  "paused",
  "cancelled",
  "completed",
  "upgraded",
]);

export const externalProviderEnum = pgEnum("external_provider", [
  "stripe_customer",
  "stripe_subscription",
  "stripe_price",
  "stripe_invoice",
  "docusign_envelope",
  "calendly_invitee",
  "calendly_event",
  "google_drive_folder",
  "google_sheet_row",
]);

export const actorRoleEnum = pgEnum("actor_role", [
  "client",
  "coach",
  "admin",
  "system",
]);

export const createdOrReusedEnum = pgEnum("created_or_reused", [
  "created",
  "reused",
]);

export const templateCategoryEnum = pgEnum("template_category", [
  "fat_loss",
  "muscle_growth",
  "body_recomposition",
  "athletic_performance",
  "lifestyle",
  "competition_prep",
  "executive_performance",
]);

export const experienceLevelEnum = pgEnum("experience_level", [
  "beginner",
  "intermediate",
  "advanced",
  "competitive",
  "mixed",
]);

export const templateStatusEnum = pgEnum("template_status", [
  "draft",
  "active",
  "archived",
]);

// ─────────────────────────────────────────────────────────────
// TABLE 1 — users
//
// Permanent identity record for every person in Catalyst OS.
// The UUID is assigned at first contact and never changes.
// Email is a secondary lookup — mutable and separately normalized
// for deduplication. See docs/catalyst-os-data-foundation.md for
// the canonical identity strategy.
//
// normalizedEmail UNIQUENESS TRADEOFF:
//   Enforced unique at the database level. This enables auth in
//   Sprint 5D (email-based login requires email uniqueness).
//   Tradeoff: two family members sharing an email address cannot
//   both be clients. In practice, each client must use a distinct
//   email. Document this requirement when onboarding.
//
// SOFT DELETE:
//   deletedAt is set instead of row deletion. All FKs pointing to
//   users use RESTRICT — you cannot delete a user with dependent
//   records. Use status = "archived" for operational suspension.
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_users_normalized_email").on(table.normalizedEmail),
    index("idx_users_role").on(table.role),
    index("idx_users_status").on(table.status),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 2 — client_profiles
//
// Demographic and contact information for clients.
// userId is both PK and FK — one profile per user, set on
// enrollment, updated throughout the coaching relationship.
//
// timezone defaults to America/Chicago — the coach's home
// timezone — and should be updated during onboarding to the
// client's actual IANA timezone for accurate mission scheduling.
// ─────────────────────────────────────────────────────────────

export const clientProfiles = pgTable("client_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict" }),
  fullName: text("full_name").notNull(),
  preferredName: text("preferred_name"),
  dateOfBirth: date("date_of_birth"),
  phone: text("phone"),
  address: text("address"),
  occupation: text("occupation"),
  emergencyContact: text("emergency_contact"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  referralSource: text("referral_source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// TABLE 3 — coach_profiles
//
// Professional metadata for coaches.
// specializations stored as JSONB array of strings.
// ─────────────────────────────────────────────────────────────

export const coachProfiles = pgTable("coach_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  specializations: jsonb("specializations").notNull().default([]),
  maxClientCapacity: integer("max_client_capacity"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// TABLE 4 — coaching_enrollments
//
// One row per client-coach coaching engagement.
// Historical enrollments are preserved — a client who upgrades
// gets a new enrollment row; the old one is set to "upgraded".
// A client can have many enrollments over time.
//
// checkInDayOfWeek:
//   0 = Sunday, 1 = Monday, ..., 6 = Saturday.
//   Enforced in range [0,6] by check constraint.
//   NULL means check-in day has not yet been assigned.
//
// pipelineStage mirrors LifecycleStage from lib/workflow.ts.
// Stored as text to avoid coupling the DB enum to the TS enum;
// values should match the LIFECYCLE_STAGES constant exactly.
//
// FK behavior:
//   clientId → RESTRICT: can't delete user with enrollments.
//   coachId  → RESTRICT: can't delete coach with enrollments.
// ─────────────────────────────────────────────────────────────

export const coachingEnrollments = pgTable(
  "coaching_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packageType: coachingPackageEnum("package_type").notNull(),
    monthlyRateCents: integer("monthly_rate_cents").notNull(),
    status: enrollmentStatusEnum("status").notNull().default("lead"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    checkInDayOfWeek: integer("check_in_day_of_week"),
    pipelineStage: text("pipeline_stage")
      .notNull()
      .default("Application Received"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_enrollments_client_id").on(table.clientId),
    index("idx_enrollments_coach_id").on(table.coachId),
    index("idx_enrollments_status").on(table.status),
    index("idx_enrollments_package_type").on(table.packageType),
    check(
      "chk_check_in_day_range",
      sql`${table.checkInDayOfWeek} IS NULL OR (${table.checkInDayOfWeek} >= 0 AND ${table.checkInDayOfWeek} <= 6)`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 5 — external_identities
//
// Maps Catalyst users and enrollments to vendor-system IDs.
// Each external system (Stripe, DocuSign, Calendly, Drive) stores
// its own ID here, keyed by the Catalyst UUID.
//
// At minimum one of userId or enrollmentId must be non-null.
// Enforced by the check constraint below.
//
// SECURITY: metadata stores context at time of creation (e.g.
// Stripe event type, Drive folder name). Never store secrets,
// tokens, or credentials in metadata — those belong in env vars.
//
// provider + externalId is unique — prevents duplicate mappings
// for the same vendor record.
//
// FK behavior:
//   userId       → SET NULL: external record survives user archival
//   enrollmentId → SET NULL: external record survives enrollment end
// ─────────────────────────────────────────────────────────────

export const externalIdentities = pgTable(
  "external_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    provider: externalProviderEnum("provider").notNull(),
    externalId: text("external_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("uq_external_provider_id").on(table.provider, table.externalId),
    index("idx_external_identities_user_id").on(table.userId),
    index("idx_external_identities_enrollment_id").on(table.enrollmentId),
    index("idx_external_identities_provider").on(table.provider),
    check(
      "chk_external_must_have_reference",
      sql`${table.userId} IS NOT NULL OR ${table.enrollmentId} IS NOT NULL`,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 6 — enrollment_events
//
// Append-only enrollment history log.
// Never update or delete rows — only insert.
// Records every stage transition, package change, pause, resume,
// coach reassignment, and rate adjustment.
//
// FK behavior:
//   enrollmentId → RESTRICT: enrollment can't be deleted while it
//     has history (which is always true once created).
//   actorId → SET NULL: actor record may be archived, event preserved.
// ─────────────────────────────────────────────────────────────

export const enrollmentEvents = pgTable(
  "enrollment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => coachingEnrollments.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_enrollment_events_enrollment_id").on(table.enrollmentId),
    index("idx_enrollment_events_event_type").on(table.eventType),
    index("idx_enrollment_events_occurred_at").on(table.occurredAt),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 7 — timeline_events
//
// Append-only client activity timeline shown in the coach dashboard.
// Records significant lifecycle moments: agreement sent, payment
// received, onboarding submitted, program built, block unlocked,
// check-in submitted, streak milestone, etc.
//
// FK behavior:
//   clientId     → RESTRICT: client must exist while timeline exists.
//   enrollmentId → SET NULL: event preserved if enrollment is ended.
//   actorId      → SET NULL: event preserved if actor is archived.
// ─────────────────────────────────────────────────────────────

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    eventType: text("event_type").notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: actorRoleEnum("actor_role").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_timeline_client_occurred").on(table.clientId, table.occurredAt),
    index("idx_timeline_enrollment_id").on(table.enrollmentId),
    index("idx_timeline_event_type").on(table.eventType),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 8 — drive_workspaces
//
// Records Google Drive workspace folder structure created by
// scripts/drive-workspace-backend.gs after Stripe checkout.
// The GAS script remains unchanged — this table is an additional
// structured record created alongside the Google Sheet log.
//
// UNIQUENESS:
//   uniqueIndex on enrollmentId: one active workspace per enrollment.
//   Postgres allows multiple NULL values in a unique index, so
//   workspaces not yet linked to an enrollment (enrollmentId IS NULL)
//   can coexist without conflict.
//
// FK behavior:
//   clientId     → RESTRICT: workspace record tied to client identity.
//   enrollmentId → SET NULL: workspace record preserved if enrollment ends.
// ─────────────────────────────────────────────────────────────

export const driveWorkspaces = pgTable(
  "drive_workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    enrollmentId: uuid("enrollment_id").references(
      () => coachingEnrollments.id,
      { onDelete: "set null" },
    ),
    rootFolderId: text("root_folder_id").notNull(),
    rootFolderUrl: text("root_folder_url").notNull(),
    yearFolder: text("year_folder").notNull(),
    packageFolder: text("package_folder").notNull(),
    clientFolderName: text("client_folder_name").notNull(),
    subfolderIds: jsonb("subfolder_ids").notNull().default({}),
    createdOrReused: createdOrReusedEnum("created_or_reused").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_drive_workspace_enrollment").on(table.enrollmentId),
    index("idx_drive_workspaces_client_id").on(table.clientId),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 9 — program_templates
//
// Reusable Catalyst coaching blueprints authored by coaches.
// Templates are versioned using separate rows + parentTemplateId chain.
//
// VERSIONING STRATEGY — Separate Rows:
//   Each version is a new row. version integer tracks the sequence.
//   parentTemplateId points to the immediately preceding version.
//   Only one row per logical template family should have
//   status = "active" at any time; older versions are "archived".
//
//   Why separate rows (not in-place version field only):
//     - An already-assigned version remains intact and queryable.
//     - Future client programs reference the specific template row
//       that was active when the program was built.
//     - Full lineage is traversable via parentTemplateId chain.
//     - Rollback is possible: set the previous version back to "active".
//
//   Slug uniqueness:
//     slug is globally unique. When creating a new version, append
//     a suffix (e.g. "-v2") or reuse the same slug after archiving
//     the old row. Application logic enforces the one-active-per-slug
//     invariant; the DB enforces global uniqueness.
//
// FK behavior:
//   createdBy       → SET NULL: template survives coach account changes.
//   parentTemplateId → SET NULL: version chain persists if a parent row
//     is deleted (rare — prefer archiving over deletion).
// ─────────────────────────────────────────────────────────────

export const programTemplates = pgTable(
  "program_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    category: templateCategoryEnum("category").notNull(),
    experienceLevel: experienceLevelEnum("experience_level").notNull(),
    recommendedDaysPerWeek: integer("recommended_days_per_week"),
    defaultDurationWeeks: integer("default_duration_weeks"),
    status: templateStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    parentTemplateId: uuid("parent_template_id").references(
      (): AnyPgColumn => programTemplates.id,
      { onDelete: "set null" },
    ),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_program_template_slug").on(table.slug),
    index("idx_program_templates_status").on(table.status),
    index("idx_program_templates_category").on(table.category),
    index("idx_program_templates_experience").on(table.experienceLevel),
    index("idx_program_templates_parent").on(table.parentTemplateId),
  ],
);

// ─────────────────────────────────────────────────────────────
// TABLE 10 — workout_templates
//
// Reusable workout-day templates that program templates can reference.
// Same versioning strategy as program_templates (separate rows + chain).
//
// Exercise prescriptions are NOT included in this sprint.
// This table captures only the workout identity and metadata —
// the "what is this workout" layer, not the exercise-by-exercise detail.
// Exercise prescription tables are added in Sprint 5B.3.
// ─────────────────────────────────────────────────────────────

export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    primaryFocus: text("primary_focus"),
    recommendedExperienceLevel: experienceLevelEnum(
      "recommended_experience_level",
    ).notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    recommendedEquipment: jsonb("recommended_equipment").notNull().default([]),
    status: templateStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    parentTemplateId: uuid("parent_template_id").references(
      (): AnyPgColumn => workoutTemplates.id,
      { onDelete: "set null" },
    ),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_workout_template_slug").on(table.slug),
    index("idx_workout_templates_status").on(table.status),
    index("idx_workout_templates_experience").on(
      table.recommendedExperienceLevel,
    ),
    index("idx_workout_templates_parent").on(table.parentTemplateId),
  ],
);

// ─────────────────────────────────────────────────────────────
// INFERRED TYPESCRIPT TYPES
//
// Drizzle generates precise types from the schema definition.
// Use these types across the codebase instead of manually
// declaring interfaces — they stay in sync with the schema
// automatically.
//
// Select types: shape of a row returned from the database.
// Insert types: shape of a row passed to insert/create operations.
// ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;

export type CoachProfile = typeof coachProfiles.$inferSelect;
export type NewCoachProfile = typeof coachProfiles.$inferInsert;

export type CoachingEnrollment = typeof coachingEnrollments.$inferSelect;
export type NewCoachingEnrollment = typeof coachingEnrollments.$inferInsert;

export type ExternalIdentity = typeof externalIdentities.$inferSelect;
export type NewExternalIdentity = typeof externalIdentities.$inferInsert;

export type EnrollmentEvent = typeof enrollmentEvents.$inferSelect;
export type NewEnrollmentEvent = typeof enrollmentEvents.$inferInsert;

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;

export type DriveWorkspace = typeof driveWorkspaces.$inferSelect;
export type NewDriveWorkspace = typeof driveWorkspaces.$inferInsert;

export type ProgramTemplate = typeof programTemplates.$inferSelect;
export type NewProgramTemplate = typeof programTemplates.$inferInsert;

export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type NewWorkoutTemplate = typeof workoutTemplates.$inferInsert;

// Enum value types — useful for type-safe function parameters
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type CoachingPackage = (typeof coachingPackageEnum.enumValues)[number];
export type EnrollmentStatus = (typeof enrollmentStatusEnum.enumValues)[number];
export type ExternalProvider = (typeof externalProviderEnum.enumValues)[number];
export type ActorRole = (typeof actorRoleEnum.enumValues)[number];
export type TemplateCategory = (typeof templateCategoryEnum.enumValues)[number];
export type ExperienceLevel = (typeof experienceLevelEnum.enumValues)[number];
export type TemplateStatus = (typeof templateStatusEnum.enumValues)[number];
