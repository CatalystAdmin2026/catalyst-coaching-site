// ─────────────────────────────────────────────────────────────
// Catalyst OS — Exercise Service Layer (Sprint 5C.1)
//
// SERVER-ONLY — never import from a Client Component.
// All helpers bypass RLS (Drizzle uses the direct Postgres connection).
// All helpers return null / empty arrays on error.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, ilike, inArray, asc } from "drizzle-orm";
import { getDb } from "./client";
import {
  exercises,
  exerciseMuscles,
  exerciseEquipment,
  exerciseRelations,
  exerciseCues,
  equipmentCatalog,
  type Exercise,
  type ExerciseMuscle,
  type ExerciseRelation,
  type ExerciseCue,
  type MuscleGroup,
  type MovementPattern,
  type ExerciseClassification,
  type ExerciseDifficulty,
} from "./schema-exercise";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ExerciseFilters {
  name?: string;
  muscleGroups?: MuscleGroup[];
  movementPattern?: MovementPattern;
  classification?: ExerciseClassification;
  difficulty?: ExerciseDifficulty;
  equipmentCatalogIds?: string[];
  unilateral?: boolean;
  isCardio?: boolean;
  isMobility?: boolean;
  maxJointStressKnee?: number;
  maxJointStressShoulder?: number;
  maxJointStressSpine?: number;
  activeOnly?: boolean;
  limit?: number;
}

export interface ExerciseWithMuscles extends Exercise {
  muscles: ExerciseMuscle[];
}

export interface ExerciseWithRelations extends ExerciseWithMuscles {
  relations: ExerciseRelation[];
  cues: ExerciseCue[];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────

export async function searchExercises(
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const result = await safeQuery(async () => {
    const db = getDb();
    const {
      name,
      movementPattern,
      classification,
      difficulty,
      unilateral,
      isCardio,
      isMobility,
      maxJointStressKnee,
      maxJointStressShoulder,
      maxJointStressSpine,
      activeOnly = true,
      limit = 50,
    } = filters;

    const conditions = [];

    if (activeOnly) {
      conditions.push(eq(exercises.status, "active"));
    }
    if (name) {
      conditions.push(ilike(exercises.name, `%${name}%`));
    }
    if (movementPattern) {
      conditions.push(eq(exercises.movementPattern, movementPattern));
    }
    if (classification) {
      conditions.push(eq(exercises.classification, classification));
    }
    if (difficulty) {
      conditions.push(eq(exercises.difficulty, difficulty));
    }
    if (unilateral !== undefined) {
      conditions.push(eq(exercises.unilateral, unilateral));
    }
    if (isCardio !== undefined) {
      conditions.push(eq(exercises.isCardio, isCardio));
    }
    if (isMobility !== undefined) {
      conditions.push(eq(exercises.isMobility, isMobility));
    }

    let rows = await db
      .select()
      .from(exercises)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(exercises.name))
      .limit(limit);

    // Post-filter joint stress since these are nullable integer comparisons
    if (maxJointStressKnee !== undefined) {
      rows = rows.filter(
        (r) =>
          r.jointStressKnee === null ||
          r.jointStressKnee <= maxJointStressKnee,
      );
    }
    if (maxJointStressShoulder !== undefined) {
      rows = rows.filter(
        (r) =>
          r.jointStressShoulder === null ||
          r.jointStressShoulder <= maxJointStressShoulder,
      );
    }
    if (maxJointStressSpine !== undefined) {
      rows = rows.filter(
        (r) =>
          r.jointStressSpine === null ||
          r.jointStressSpine <= maxJointStressSpine,
      );
    }

    return rows;
  });

  return result ?? [];
}

// ─────────────────────────────────────────────────────────────
// RETRIEVAL
// ─────────────────────────────────────────────────────────────

export async function getExerciseBySlug(
  slug: string,
): Promise<Exercise | null> {
  const result = await safeQuery(async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  });
  return result ?? null;
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const result = await safeQuery(async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
  return result ?? null;
}

export async function getExerciseMuscles(
  exerciseId: string,
): Promise<ExerciseMuscle[]> {
  const result = await safeQuery(async () => {
    const db = getDb();
    return db
      .select()
      .from(exerciseMuscles)
      .where(eq(exerciseMuscles.exerciseId, exerciseId))
      .orderBy(asc(exerciseMuscles.role));
  });
  return result ?? [];
}

export async function getExerciseCues(
  exerciseId: string,
  publicOnly = true,
): Promise<ExerciseCue[]> {
  const result = await safeQuery(async () => {
    const db = getDb();
    const conditions = [eq(exerciseCues.exerciseId, exerciseId)];
    if (publicOnly) {
      conditions.push(eq(exerciseCues.isPublic, true));
    }
    return db
      .select()
      .from(exerciseCues)
      .where(and(...conditions))
      .orderBy(asc(exerciseCues.orderIndex));
  });
  return result ?? [];
}

export async function getExerciseRelations(
  exerciseId: string,
): Promise<ExerciseRelation[]> {
  const result = await safeQuery(async () => {
    const db = getDb();
    return db
      .select()
      .from(exerciseRelations)
      .where(eq(exerciseRelations.sourceExerciseId, exerciseId));
  });
  return result ?? [];
}

export async function getExerciseWithDetails(
  exerciseId: string,
): Promise<ExerciseWithRelations | null> {
  const result = await safeQuery(async () => {
    const db = getDb();
    const exerciseRows = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);

    const exercise = exerciseRows[0];
    if (!exercise) return null;

    const [muscles, relations, cues] = await Promise.all([
      db
        .select()
        .from(exerciseMuscles)
        .where(eq(exerciseMuscles.exerciseId, exerciseId)),
      db
        .select()
        .from(exerciseRelations)
        .where(eq(exerciseRelations.sourceExerciseId, exerciseId)),
      db
        .select()
        .from(exerciseCues)
        .where(
          and(
            eq(exerciseCues.exerciseId, exerciseId),
            eq(exerciseCues.isPublic, true),
          ),
        )
        .orderBy(asc(exerciseCues.orderIndex)),
    ]);

    return { ...exercise, muscles, relations, cues };
  });

  return result ?? null;
}

// Returns exercises that match a given muscle group (any role).
export async function findExercisesByMuscleGroup(
  muscleGroup: MuscleGroup,
  activeOnly = true,
): Promise<Exercise[]> {
  const result = await safeQuery(async () => {
    const db = getDb();

    const muscleRows = await db
      .select({ exerciseId: exerciseMuscles.exerciseId })
      .from(exerciseMuscles)
      .where(eq(exerciseMuscles.muscleGroup, muscleGroup));

    const exerciseIds = muscleRows.map((r) => r.exerciseId);
    if (exerciseIds.length === 0) return [];

    const conditions = [inArray(exercises.id, exerciseIds)];
    if (activeOnly) conditions.push(eq(exercises.status, "active"));

    return db
      .select()
      .from(exercises)
      .where(and(...conditions))
      .orderBy(asc(exercises.name));
  });

  return result ?? [];
}

// Returns exercises that can be performed with a given equipment set.
// An exercise is included if ALL of its required equipment is in the set.
export async function findExercisesByEquipmentSet(
  equipmentCatalogIds: string[],
  activeOnly = true,
): Promise<Exercise[]> {
  if (equipmentCatalogIds.length === 0) return [];

  const result = await safeQuery(async () => {
    const db = getDb();

    // Fetch all required equipment links
    const requiredLinks = await db
      .select({
        exerciseId: exerciseEquipment.exerciseId,
        equipmentCatalogId: exerciseEquipment.equipmentCatalogId,
      })
      .from(exerciseEquipment)
      .where(eq(exerciseEquipment.requirementType, "required"));

    // Group by exercise ID
    const reqByExercise = new Map<string, string[]>();
    for (const link of requiredLinks) {
      const existing = reqByExercise.get(link.exerciseId) ?? [];
      existing.push(link.equipmentCatalogId);
      reqByExercise.set(link.exerciseId, existing);
    }

    // Keep exercises where every required item is in the client's equipment set
    const availableSet = new Set(equipmentCatalogIds);
    const eligibleIds: string[] = [];

    for (const [exerciseId, requiredIds] of reqByExercise) {
      if (requiredIds.every((id) => availableSet.has(id))) {
        eligibleIds.push(exerciseId);
      }
    }

    // Also include exercises with NO required equipment (bodyweight)
    const allExerciseIds = (
      await db.select({ id: exercises.id }).from(exercises)
    ).map((r) => r.id);

    const exercisesWithRequiredEquipment = new Set(reqByExercise.keys());
    for (const id of allExerciseIds) {
      if (!exercisesWithRequiredEquipment.has(id)) {
        eligibleIds.push(id);
      }
    }

    if (eligibleIds.length === 0) return [];

    const conditions = [inArray(exercises.id, eligibleIds)];
    if (activeOnly) conditions.push(eq(exercises.status, "active"));

    return db
      .select()
      .from(exercises)
      .where(and(...conditions))
      .orderBy(asc(exercises.name));
  });

  return result ?? [];
}

// Returns equipment catalog items.
export async function getAllEquipment() {
  const result = await safeQuery(async () => {
    const db = getDb();
    return db.select().from(equipmentCatalog).orderBy(asc(equipmentCatalog.name));
  });
  return result ?? [];
}
