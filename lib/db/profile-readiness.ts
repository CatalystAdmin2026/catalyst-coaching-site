// ─────────────────────────────────────────────────────────────
// Catalyst OS — Profile Readiness Calculator (Sprint 5B.3)
//
// SERVER-ONLY — never import from a Client Component.
// Deterministic, no AI. Returns structured completeness signals
// per profile section and specific blockers for workout/nutrition
// generation.
//
// Blocker messages shown to clients are intentionally generic —
// they never reveal sensitive medical or coach-only details.
// ─────────────────────────────────────────────────────────────

import { getClientProfileBundle } from "./profile-service";
import type { ClientProfileBundle } from "./profile-service";

// ── Types ─────────────────────────────────────────────────────

export type ReadinessLevel = "complete" | "partial" | "missing" | "not_applicable";

export interface ProfileReadiness {
  sections: {
    identity: ReadinessLevel;
    health: ReadinessLevel;
    goals: ReadinessLevel;
    training: ReadinessLevel;
    equipment: ReadinessLevel;
    nutrition: ReadinessLevel;
    executive: ReadinessLevel;
  };
  overallPercent: number;
  blockersForWorkoutGeneration: string[];
  blockersForNutritionGeneration: string[];
}

// ── Calculator ────────────────────────────────────────────────

// Returns a fully calculated ProfileReadiness for the given client.
// Accepts an optional pre-fetched bundle to avoid a second round-trip
// when the caller already has the data.
export async function calculateProfileReadiness(
  clientId: string,
  bundle?: ClientProfileBundle,
): Promise<ProfileReadiness> {
  const data = bundle ?? (await getClientProfileBundle(clientId));
  return derive(data);
}

// ── Internal logic ────────────────────────────────────────────

function derive(data: ClientProfileBundle): ProfileReadiness {
  const workoutBlockers: string[] = [];
  const nutritionBlockers: string[] = [];

  // ── identity ────────────────────────────────────────────────
  const identity: ReadinessLevel = data.latestSubmission ? "complete" : "missing";

  // ── health ──────────────────────────────────────────────────
  let health: ReadinessLevel;
  if (!data.healthProfile) {
    health = "missing";
  } else {
    const hp = data.healthProfile;
    const hasCore =
      hp.heightInches !== null && hp.biologicalSex !== null;
    health = hasCore ? "complete" : "partial";
  }

  // Unresolved physician restrictions block workout generation
  if (data.healthProfile?.physicianRestrictions) {
    workoutBlockers.push("Unresolved physician restrictions on file — review with coach before program delivery.");
  }
  if (data.healthProfile?.medicalClearanceRequired && !data.healthProfile.medicalClearanceReceivedAt) {
    workoutBlockers.push("Medical clearance required but not yet received.");
    nutritionBlockers.push("Medical clearance required but not yet received.");
  }

  // ── goals ───────────────────────────────────────────────────
  let goals: ReadinessLevel;
  if (data.activeGoals.length === 0) {
    goals = "missing";
    workoutBlockers.push("No active goal on file — program type cannot be determined.");
    nutritionBlockers.push("No active goal on file — nutrition targets cannot be configured.");
  } else {
    goals = "complete";
  }

  // ── training ────────────────────────────────────────────────
  let training: ReadinessLevel;
  if (!data.trainingProfile) {
    training = "missing";
    workoutBlockers.push("Training availability not yet provided (days per week, schedule).");
  } else {
    const tp = data.trainingProfile;
    const hasAvailability = tp.availableDaysPerWeek !== null;
    const hasExperience = tp.experienceLevel !== null;
    if (hasAvailability && hasExperience) {
      training = "complete";
    } else if (hasAvailability || hasExperience) {
      training = "partial";
      if (!hasAvailability) {
        workoutBlockers.push("Training days per week not specified.");
      }
      if (!hasExperience) {
        workoutBlockers.push("Training experience level not specified.");
      }
    } else {
      training = "missing";
      workoutBlockers.push("Training profile is incomplete — days per week and experience level required.");
    }
  }

  // ── equipment ───────────────────────────────────────────────
  let equipment: ReadinessLevel;
  if (data.equipment.length === 0) {
    equipment = "missing";
    workoutBlockers.push("No available equipment on file — exercise substitutions cannot be generated.");
  } else {
    equipment = "complete";
  }

  // ── nutrition ───────────────────────────────────────────────
  let nutrition: ReadinessLevel;
  if (!data.nutritionProfile) {
    nutrition = "missing";
    nutritionBlockers.push("Nutrition preferences not yet provided.");
  } else {
    const np = data.nutritionProfile;
    const hasDietaryInfo =
      np.dietaryPattern !== null || np.allergies !== null;
    const hasFoodPrefs =
      np.foodsLiked !== null || np.foodsDisliked !== null;
    if (hasDietaryInfo && hasFoodPrefs) {
      nutrition = "complete";
    } else {
      nutrition = "partial";
    }
    // Height and weight from health profile are needed for nutrition calculations
    if (!data.healthProfile?.heightInches) {
      nutritionBlockers.push("Height not on file — required for nutrition calculations.");
    }
    if (!data.latestBodyComp?.weightPounds && !data.healthProfile) {
      nutritionBlockers.push("Current bodyweight not on file — required for nutrition calculations.");
    }
  }

  // ── executive ────────────────────────────────────────────────
  // not_applicable for non-executive clients (no executive health profile at all
  // and no executive goal type)
  const isExecutiveClient =
    data.executiveHealthProfile !== null ||
    data.activeGoals.some((g) => g.goalType === "executive_performance");

  let executive: ReadinessLevel;
  if (!isExecutiveClient) {
    executive = "not_applicable";
  } else if (!data.executiveHealthProfile) {
    executive = "missing";
  } else {
    const ep = data.executiveHealthProfile;
    executive = ep.dataConsentAt !== null ? "complete" : "partial";
  }

  // ── overallPercent ──────────────────────────────────────────
  const sections: Record<string, ReadinessLevel> = {
    identity,
    health,
    goals,
    training,
    equipment,
    nutrition,
    executive,
  };

  const scorableKeys = ["identity", "health", "goals", "training", "equipment", "nutrition"] as const;

  const scores: Record<ReadinessLevel, number> = {
    complete: 1,
    partial: 0.5,
    missing: 0,
    not_applicable: 1, // not_applicable doesn't reduce the overall score
  };

  const total = scorableKeys.reduce(
    (sum, key) => sum + scores[sections[key]],
    0,
  );
  const overallPercent = Math.round((total / scorableKeys.length) * 100);

  return {
    sections: {
      identity,
      health,
      goals,
      training,
      equipment,
      nutrition,
      executive,
    },
    overallPercent,
    blockersForWorkoutGeneration: workoutBlockers,
    blockersForNutritionGeneration: nutritionBlockers,
  };
}
