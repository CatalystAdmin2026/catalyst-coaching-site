// ─────────────────────────────────────────────────────────────
// Catalyst OS — Workout Blueprint Validation Service (Sprint 5C.1)
//
// SERVER-ONLY — never import from a Client Component.
// validateWorkoutTemplate runs structural and integrity checks on
// a workout template and its exercise prescriptions before publishing.
//
// This validator does NOT generate workouts or assign them to clients.
// It validates that a blueprint is internally consistent and references
// only active, published exercises.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, asc, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { workoutTemplates } from "./schema";
import {
  exercises,
  workoutTemplateSections,
  workoutTemplateExercises,
} from "./schema-exercise";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    templateId: string;
    templateName: string;
    sectionCount: number;
    exerciseCount: number;
    groupCount: number;
    estimatedMinutes: number | null;
  };
}

// ─────────────────────────────────────────────────────────────
// VALIDATOR
// ─────────────────────────────────────────────────────────────

export async function validateWorkoutTemplate(
  templateId: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const db = getDb();

  // ── 1. Load the template ──────────────────────────────────
  const templateRows = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.id, templateId))
    .limit(1);

  const template = templateRows[0];
  if (!template) {
    return {
      valid: false,
      errors: [`Template not found: ${templateId}`],
      warnings: [],
      summary: {
        templateId,
        templateName: "(unknown)",
        sectionCount: 0,
        exerciseCount: 0,
        groupCount: 0,
        estimatedMinutes: null,
      },
    };
  }

  // ── 2. Load sections ──────────────────────────────────────
  const sections = await db
    .select()
    .from(workoutTemplateSections)
    .where(eq(workoutTemplateSections.workoutTemplateId, templateId))
    .orderBy(asc(workoutTemplateSections.orderIndex));

  // Check for duplicate section orderIndexes
  const sectionOrderSeen = new Set<number>();
  for (const section of sections) {
    if (sectionOrderSeen.has(section.orderIndex)) {
      errors.push(
        `Duplicate section orderIndex ${section.orderIndex} in template "${template.name}".`,
      );
    }
    sectionOrderSeen.add(section.orderIndex);
  }

  const sectionIds = new Set(sections.map((s) => s.id));

  // ── 3. Load exercise prescriptions ───────────────────────
  const prescriptions = await db
    .select()
    .from(workoutTemplateExercises)
    .where(eq(workoutTemplateExercises.workoutTemplateId, templateId))
    .orderBy(asc(workoutTemplateExercises.orderIndex));

  if (prescriptions.length === 0) {
    warnings.push(
      "Template has no exercise prescriptions. Add at least one exercise before publishing.",
    );
  }

  // ── 4. Validate section references ────────────────────────
  for (const p of prescriptions) {
    if (p.sectionId !== null && !sectionIds.has(p.sectionId)) {
      errors.push(
        `Prescription ${p.id} references section ${p.sectionId} which does not belong to this template.`,
      );
    }
  }

  // ── 5. Check for duplicate orderIndex within each section ─
  const orderBySection = new Map<string | null, Set<number>>();
  for (const p of prescriptions) {
    const key = p.sectionId ?? null;
    const seen = orderBySection.get(key) ?? new Set();
    if (seen.has(p.orderIndex)) {
      const ctx = key ? `section ${key}` : "unsectioned exercises";
      errors.push(
        `Duplicate orderIndex ${p.orderIndex} in ${ctx} for template "${template.name}".`,
      );
    }
    seen.add(p.orderIndex);
    orderBySection.set(key, seen);
  }

  // ── 6. Validate exercise references are active ────────────
  const exerciseIds = [...new Set(prescriptions.map((p) => p.exerciseId))];
  let inactiveExercises: string[] = [];

  if (exerciseIds.length > 0) {
    const exerciseRows = await db
      .select({ id: exercises.id, name: exercises.name, status: exercises.status })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    const exerciseMap = new Map(exerciseRows.map((e) => [e.id, e]));

    // Check for missing exercise IDs
    for (const id of exerciseIds) {
      if (!exerciseMap.has(id)) {
        errors.push(`Exercise ${id} referenced in template does not exist.`);
      }
    }

    // Check for non-active exercises
    inactiveExercises = exerciseRows
      .filter((e) => e.status !== "active")
      .map((e) => `"${e.name}" (${e.status})`);

    if (inactiveExercises.length > 0) {
      errors.push(
        `Template references non-active exercises: ${inactiveExercises.join(", ")}. Publish or activate them before publishing this template.`,
      );
    }
  }

  // ── 7. Validate superset/triset group consistency ─────────
  const groupMap = new Map<string, typeof prescriptions>();
  for (const p of prescriptions) {
    if (p.groupId) {
      const group = groupMap.get(p.groupId) ?? [];
      group.push(p);
      groupMap.set(p.groupId, group);
    }
  }

  for (const [groupId, members] of groupMap) {
    if (members.length < 2) {
      warnings.push(
        `Group ${groupId} has only 1 exercise. Supersets and circuits require at least 2.`,
      );
    }

    // All members of a group should use the same set_technique
    const techniques = new Set(members.map((m) => m.setTechnique));
    if (techniques.size > 1) {
      warnings.push(
        `Group ${groupId} mixes set techniques: ${[...techniques].join(", ")}. Use a consistent technique within a group.`,
      );
    }

    // groupPositions should be sequential starting at 1
    const positions = members
      .map((m) => m.groupPosition)
      .filter((p) => p !== null)
      .sort((a, b) => a! - b!);
    const expectedPositions = Array.from(
      { length: positions.length },
      (_, i) => i + 1,
    );
    if (JSON.stringify(positions) !== JSON.stringify(expectedPositions)) {
      warnings.push(
        `Group ${groupId} has non-sequential groupPositions: [${positions.join(", ")}]. Expected [${expectedPositions.join(", ")}].`,
      );
    }
  }

  // ── 8. Validate rep ranges ────────────────────────────────
  for (const p of prescriptions) {
    if (
      p.repsMin !== null &&
      p.repsMax !== null &&
      p.repsMin > p.repsMax
    ) {
      errors.push(
        `Prescription ${p.id}: repsMin (${p.repsMin}) exceeds repsMax (${p.repsMax}).`,
      );
    }
  }

  // ── 9. Check days-per-week bounds ─────────────────────────
  if (
    template.minimumDaysPerWeek !== null &&
    template.maximumDaysPerWeek !== null &&
    template.minimumDaysPerWeek > template.maximumDaysPerWeek
  ) {
    errors.push(
      `minimumDaysPerWeek (${template.minimumDaysPerWeek}) exceeds maximumDaysPerWeek (${template.maximumDaysPerWeek}).`,
    );
  }

  // ── 10. Warn if template has no sections defined ──────────
  if (sections.length === 0 && prescriptions.length > 0) {
    warnings.push(
      "Template has exercises but no sections. Consider organizing exercises into sections (warmup, main lift, etc.) before publishing.",
    );
  }

  // ── Summary ───────────────────────────────────────────────
  const estimatedMinutes =
    sections.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0) || null;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      templateId,
      templateName: template.name,
      sectionCount: sections.length,
      exerciseCount: prescriptions.length,
      groupCount: groupMap.size,
      estimatedMinutes:
        estimatedMinutes !== null && estimatedMinutes > 0
          ? estimatedMinutes
          : null,
    },
  };
}
