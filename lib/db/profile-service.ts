// ─────────────────────────────────────────────────────────────
// Catalyst OS — Profile Service Layer (Sprint 5B.3)
//
// SERVER-ONLY — never import from a Client Component.
// All helpers bypass RLS (Drizzle uses the direct Postgres connection).
// clientId is always validated by the caller via requireClientUser()
// before being passed here — never trust a client-provided UUID directly.
//
// All helpers return null / empty arrays on error rather than throwing,
// so callers can render graceful empty states before the migration
// is applied and after tables are populated.
// ─────────────────────────────────────────────────────────────

import { desc, eq, and } from "drizzle-orm";
import { getDb } from "./client";
import {
  onboardingSubmissions,
  healthProfiles,
  clientGoals,
  injuriesLimitations,
  trainingProfiles,
  equipmentAccess,
  nutritionProfiles,
  bodyCompositionRecords,
  executiveHealthProfiles,
  clientPreferences,
  type OnboardingSubmission,
  type HealthProfile,
  type ClientGoal,
  type InjuryLimitation,
  type TrainingProfile,
  type EquipmentAccess,
  type NutritionProfile,
  type BodyCompositionRecord,
  type ExecutiveHealthProfile,
  type ClientPreference,
} from "./schema-profile";

// ── Return types ─────────────────────────────────────────────

export interface ClientProfileBundle {
  latestSubmission: OnboardingSubmission | null;
  healthProfile: HealthProfile | null;
  activeGoals: ClientGoal[];
  trainingProfile: TrainingProfile | null;
  equipment: EquipmentAccess[];
  nutritionProfile: NutritionProfile | null;
  latestBodyComp: BodyCompositionRecord | null;
  executiveHealthProfile: ExecutiveHealthProfile | null;
  preferences: ClientPreference | null;
}

export interface ClientHealthRestrictions {
  healthProfile: HealthProfile | null;
  activeInjuries: InjuryLimitation[];
}

// ── Helpers ──────────────────────────────────────────────────

// Returns the full profile bundle for a client in a single call.
// Runs multiple queries in parallel. Each query is wrapped independently
// so a partial failure (e.g. table not yet migrated) degrades gracefully.
export async function getClientProfileBundle(
  clientId: string,
): Promise<ClientProfileBundle> {
  const db = getDb();

  const [
    latestSubmission,
    healthProfile,
    activeGoals,
    trainingProfile,
    equipment,
    nutritionProfile,
    latestBodyComp,
    executiveHealthProfile,
    preferences,
  ] = await Promise.all([
    safeQuery(() =>
      db
        .select()
        .from(onboardingSubmissions)
        .where(eq(onboardingSubmissions.clientId, clientId))
        .orderBy(desc(onboardingSubmissions.submittedAt))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(clientGoals)
        .where(
          and(
            eq(clientGoals.clientId, clientId),
            eq(clientGoals.status, "active"),
          ),
        )
        .orderBy(clientGoals.priority)
        .then((r) => r),
    ).then((r) => r ?? []),
    safeQuery(() =>
      db
        .select()
        .from(trainingProfiles)
        .where(eq(trainingProfiles.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(equipmentAccess)
        .where(
          and(
            eq(equipmentAccess.clientId, clientId),
            eq(equipmentAccess.available, true),
          ),
        )
        .then((r) => r),
    ).then((r) => r ?? []),
    safeQuery(() =>
      db
        .select()
        .from(nutritionProfiles)
        .where(eq(nutritionProfiles.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(bodyCompositionRecords)
        .where(eq(bodyCompositionRecords.clientId, clientId))
        .orderBy(desc(bodyCompositionRecords.recordedAt))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(executiveHealthProfiles)
        .where(eq(executiveHealthProfiles.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(clientPreferences)
        .where(eq(clientPreferences.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
  ]);

  return {
    latestSubmission,
    healthProfile,
    activeGoals,
    trainingProfile,
    equipment,
    nutritionProfile,
    latestBodyComp,
    executiveHealthProfile,
    preferences,
  };
}

// Returns the most recent onboarding submission for a client.
export async function getLatestOnboardingSubmission(
  clientId: string,
): Promise<OnboardingSubmission | null> {
  return safeQuery(() =>
    getDb()
      .select()
      .from(onboardingSubmissions)
      .where(eq(onboardingSubmissions.clientId, clientId))
      .orderBy(desc(onboardingSubmissions.submittedAt))
      .limit(1)
      .then((r) => r[0] ?? null),
  );
}

// Returns all active goals for a client, ordered by priority.
export async function getClientGoals(
  clientId: string,
): Promise<ClientGoal[]> {
  const result = await safeQuery(() =>
    getDb()
      .select()
      .from(clientGoals)
      .where(
        and(
          eq(clientGoals.clientId, clientId),
          eq(clientGoals.status, "active"),
        ),
      )
      .orderBy(clientGoals.priority),
  );
  return result ?? [];
}

// Returns the training profile for a client.
export async function getClientTrainingProfile(
  clientId: string,
): Promise<TrainingProfile | null> {
  return safeQuery(() =>
    getDb()
      .select()
      .from(trainingProfiles)
      .where(eq(trainingProfiles.clientId, clientId))
      .limit(1)
      .then((r) => r[0] ?? null),
  );
}

// Returns the nutrition profile for a client.
export async function getClientNutritionProfile(
  clientId: string,
): Promise<NutritionProfile | null> {
  return safeQuery(() =>
    getDb()
      .select()
      .from(nutritionProfiles)
      .where(eq(nutritionProfiles.clientId, clientId))
      .limit(1)
      .then((r) => r[0] ?? null),
  );
}

// Returns health profile and active injuries — server-only.
// Callers must not forward this data to the browser or client components.
export async function getClientHealthRestrictions(
  clientId: string,
): Promise<ClientHealthRestrictions> {
  const db = getDb();
  const [healthProfile, activeInjuries] = await Promise.all([
    safeQuery(() =>
      db
        .select()
        .from(healthProfiles)
        .where(eq(healthProfiles.clientId, clientId))
        .limit(1)
        .then((r) => r[0] ?? null),
    ),
    safeQuery(() =>
      db
        .select()
        .from(injuriesLimitations)
        .where(
          and(
            eq(injuriesLimitations.clientId, clientId),
            eq(injuriesLimitations.status, "active"),
          ),
        )
        .then((r) => r),
    ).then((r) => r ?? []),
  ]);
  return { healthProfile, activeInjuries };
}

// ── Internal ─────────────────────────────────────────────────

// Wraps a Drizzle query in a try/catch.
// Returns null if the table doesn't exist yet (pre-migration) or on
// any other runtime error — callers render graceful empty states.
async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}
