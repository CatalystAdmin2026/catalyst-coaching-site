// ─────────────────────────────────────────────────────────────
// Catalyst OS — Check-In Validation (Sprint 6.3B)
//
// Pure functions — no server-only imports.
// Mirrors every DB CHECK constraint in 0006_check_in_schema.sql.
//
// Importable in Client Components (for real-time inline errors)
// and in server actions (for pre-Drizzle validation).
//
// Rules enforced (matching CHECK constraints exactly):
//   bodyWeightLbs     > 0           (numeric string)
//   waistInches       > 0           (numeric string)
//   averageSleepHours >= 0, <= 24   (numeric string; 24h physical cap)
//   averageStress     1..10
//   averageEnergy     1..10
//   averageHunger     1..10
//   digestionRating   1..10
//   averageWaterOunces >= 0
//   averageSteps       >= 0
//   workoutCompliancePct  0..100
//   nutritionCompliancePct 0..100
// ─────────────────────────────────────────────────────────────

// Input shape — matches CheckInDraftData structurally.
// Defined here so this module has no cross-module dependencies.
interface CheckInValidationInput {
  bodyWeightLbs?: string | null;
  waistInches?: string | null;
  averageSleepHours?: string | null;
  averageStress?: number | null;
  averageEnergy?: number | null;
  averageHunger?: number | null;
  digestionRating?: number | null;
  averageWaterOunces?: number | null;
  averageSteps?: number | null;
  workoutCompliancePct?: number | null;
  nutritionCompliancePct?: number | null;
}

export interface CheckInFieldErrors {
  bodyWeightLbs?: string;
  waistInches?: string;
  averageSleepHours?: string;
  averageStress?: string;
  averageEnergy?: string;
  averageHunger?: string;
  digestionRating?: string;
  averageWaterOunces?: string;
  averageSteps?: string;
  workoutCompliancePct?: string;
  nutritionCompliancePct?: string;
}

// Validates check-in data. Returns a map of field → error message.
// An empty object means all fields are valid.
export function validateCheckInDraft(
  data: CheckInValidationInput,
): CheckInFieldErrors {
  const errors: CheckInFieldErrors = {};

  // bodyWeightLbs — numeric string; DB: body_weight_lbs > 0
  if (data.bodyWeightLbs != null && data.bodyWeightLbs !== "") {
    const n = Number(data.bodyWeightLbs);
    if (!isFinite(n) || n <= 0) {
      errors.bodyWeightLbs = "Weight must be greater than 0.";
    }
  }

  // waistInches — numeric string; DB: waist_inches > 0
  if (data.waistInches != null && data.waistInches !== "") {
    const n = Number(data.waistInches);
    if (!isFinite(n) || n <= 0) {
      errors.waistInches = "Waist must be greater than 0.";
    }
  }

  // averageSleepHours — numeric string; DB: >= 0; physical cap: <= 24
  if (data.averageSleepHours != null && data.averageSleepHours !== "") {
    const n = Number(data.averageSleepHours);
    if (!isFinite(n) || n < 0) {
      errors.averageSleepHours = "Sleep hours must be 0 or greater.";
    } else if (n > 24) {
      errors.averageSleepHours = "Sleep hours cannot exceed 24 per day.";
    }
  }

  // averageStress — DB: >= 1 AND <= 10
  if (data.averageStress != null) {
    if (data.averageStress < 1 || data.averageStress > 10) {
      errors.averageStress = "Stress must be between 1 and 10.";
    }
  }

  // averageEnergy — DB: >= 1 AND <= 10
  if (data.averageEnergy != null) {
    if (data.averageEnergy < 1 || data.averageEnergy > 10) {
      errors.averageEnergy = "Energy must be between 1 and 10.";
    }
  }

  // averageHunger — DB: >= 1 AND <= 10
  if (data.averageHunger != null) {
    if (data.averageHunger < 1 || data.averageHunger > 10) {
      errors.averageHunger = "Hunger must be between 1 and 10.";
    }
  }

  // digestionRating — DB: >= 1 AND <= 10
  if (data.digestionRating != null) {
    if (data.digestionRating < 1 || data.digestionRating > 10) {
      errors.digestionRating = "Digestion must be between 1 and 10.";
    }
  }

  // averageWaterOunces — DB: >= 0
  if (data.averageWaterOunces != null) {
    if (!isFinite(data.averageWaterOunces) || data.averageWaterOunces < 0) {
      errors.averageWaterOunces = "Water intake must be 0 or greater.";
    }
  }

  // averageSteps — DB: >= 0
  if (data.averageSteps != null) {
    if (!isFinite(data.averageSteps) || data.averageSteps < 0) {
      errors.averageSteps = "Steps must be 0 or greater.";
    }
  }

  // workoutCompliancePct — DB: >= 0 AND <= 100
  if (data.workoutCompliancePct != null) {
    if (data.workoutCompliancePct < 0 || data.workoutCompliancePct > 100) {
      errors.workoutCompliancePct = "Workout compliance must be between 0 and 100.";
    }
  }

  // nutritionCompliancePct — DB: >= 0 AND <= 100
  if (data.nutritionCompliancePct != null) {
    if (data.nutritionCompliancePct < 0 || data.nutritionCompliancePct > 100) {
      errors.nutritionCompliancePct = "Nutrition compliance must be between 0 and 100.";
    }
  }

  return errors;
}

export function hasFieldErrors(errors: CheckInFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
