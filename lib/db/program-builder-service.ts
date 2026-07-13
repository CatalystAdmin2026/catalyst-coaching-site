// ─────────────────────────────────────────────────────────────
// Catalyst OS — Program Builder Service (Sprint 6.0)
//
// SERVER-ONLY — never import from a Client Component.
// CRUD for program_templates, program_weeks, and program_week_days.
// Validation: blueprints must pass validateWorkoutTemplate() before
// a program can be published.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, asc, inArray, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  programTemplates,
  workoutTemplates,
  type ProgramTemplate,
  type TemplateCategory,
  type ExperienceLevel,
} from "./schema";
import {
  programWeeks,
  programWeekDays,
  type ProgramWeek,
  type ProgramWeekDay,
} from "./schema-program";
import { validateWorkoutTemplate } from "./workout-validator";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────

export interface ProgramDayData {
  day: ProgramWeekDay;
  workoutName: string | null;
  workoutStatus: string | null;
}

export interface ProgramWeekData {
  week: ProgramWeek;
  days: ProgramDayData[];
}

export interface ProgramContent {
  template: ProgramTemplate;
  weeks: ProgramWeekData[];
}

export interface CreateProgramInput {
  name: string;
  category: TemplateCategory;
  experienceLevel: ExperienceLevel;
  description?: string | null;
  recommendedDaysPerWeek?: number | null;
  defaultDurationWeeks?: number | null;
  createdBy?: string | null;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string | null;
  category?: TemplateCategory;
  experienceLevel?: ExperienceLevel;
  recommendedDaysPerWeek?: number | null;
  defaultDurationWeeks?: number | null;
  status?: string;
}

// ─────────────────────────────────────────────────────────────
// PROGRAM TEMPLATE CRUD
// ─────────────────────────────────────────────────────────────

export async function listProgramTemplates(): Promise<ProgramTemplate[]> {
  const db = getDb();
  return db
    .select()
    .from(programTemplates)
    .orderBy(asc(programTemplates.createdAt));
}

export async function getProgramTemplate(
  id: string,
): Promise<ProgramTemplate | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(programTemplates)
    .where(eq(programTemplates.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createProgramTemplate(
  data: CreateProgramInput,
): Promise<ProgramTemplate> {
  const db = getDb();
  const slug = slugify(data.name);

  const [row] = await db
    .insert(programTemplates)
    .values({
      name: data.name,
      slug,
      category: data.category,
      experienceLevel: data.experienceLevel,
      description: data.description ?? null,
      recommendedDaysPerWeek: data.recommendedDaysPerWeek ?? null,
      defaultDurationWeeks: data.defaultDurationWeeks ?? null,
      status: "draft",
      version: 1,
      createdBy: data.createdBy ?? null,
    })
    .returning();

  // Auto-scaffold weeks if defaultDurationWeeks is set
  if (data.defaultDurationWeeks && data.defaultDurationWeeks > 0) {
    const weekValues = Array.from(
      { length: data.defaultDurationWeeks },
      (_, i) => ({
        programTemplateId: row.id,
        weekNumber: i + 1,
        label: `Week ${i + 1}`,
      }),
    );
    await db.insert(programWeeks).values(weekValues);
  }

  return row;
}

export async function updateProgramTemplate(
  id: string,
  data: UpdateProgramInput,
): Promise<ProgramTemplate> {
  const db = getDb();
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) {
    updates.name = data.name;
    updates.slug = slugify(data.name);
  }
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.experienceLevel !== undefined)
    updates.experienceLevel = data.experienceLevel;
  if (data.recommendedDaysPerWeek !== undefined)
    updates.recommendedDaysPerWeek = data.recommendedDaysPerWeek;
  if (data.defaultDurationWeeks !== undefined)
    updates.defaultDurationWeeks = data.defaultDurationWeeks;
  if (data.status !== undefined) updates.status = data.status;

  const [row] = await db
    .update(programTemplates)
    .set(updates)
    .where(eq(programTemplates.id, id))
    .returning();

  return row;
}

export async function deleteProgramTemplate(id: string): Promise<void> {
  const db = getDb();
  // Delete days → weeks first (FK constraints)
  const weeks = await db
    .select({ id: programWeeks.id })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, id));

  if (weeks.length > 0) {
    const weekIds = weeks.map((w) => w.id);
    await db
      .delete(programWeekDays)
      .where(inArray(programWeekDays.programWeekId, weekIds));
    await db
      .delete(programWeeks)
      .where(eq(programWeeks.programTemplateId, id));
  }

  await db.delete(programTemplates).where(eq(programTemplates.id, id));
}

// ─────────────────────────────────────────────────────────────
// PUBLISH VALIDATION
//
// Before setting status = 'active', every workout blueprint
// assigned to the program must pass validateWorkoutTemplate().
// Returns { valid: true } or { valid: false, errors: string[] }.
// ─────────────────────────────────────────────────────────────

export interface PublishValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validateProgramForPublish(
  programId: string,
): Promise<PublishValidationResult> {
  const db = getDb();
  const errors: string[] = [];

  // Collect all unique workout template IDs across all week days
  const weeks = await db
    .select({ id: programWeeks.id })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, programId));

  if (weeks.length === 0) {
    return { valid: false, errors: ["Program has no weeks defined."] };
  }

  const weekIds = weeks.map((w) => w.id);
  const days = await db
    .select({
      workoutTemplateId: programWeekDays.workoutTemplateId,
    })
    .from(programWeekDays)
    .where(inArray(programWeekDays.programWeekId, weekIds));

  const templateIds = [
    ...new Set(
      days
        .map((d) => d.workoutTemplateId)
        .filter((id): id is string => id !== null),
    ),
  ];

  if (templateIds.length === 0) {
    return {
      valid: false,
      errors: ["Program has no workout blueprints assigned to any days."],
    };
  }

  // Check each blueprint: must be status='active' and pass validation
  const templates = await db
    .select({ id: workoutTemplates.id, name: workoutTemplates.name, status: workoutTemplates.status })
    .from(workoutTemplates)
    .where(inArray(workoutTemplates.id, templateIds));

  for (const t of templates) {
    if (t.status !== "active") {
      errors.push(
        `Blueprint "${t.name}" is not published (status: ${t.status}). Publish it before adding to this program.`,
      );
      continue;
    }
    const result = await validateWorkoutTemplate(t.id);
    if (!result.valid) {
      errors.push(
        `Blueprint "${t.name}" failed validation: ${result.errors.join("; ")}`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function publishProgram(id: string): Promise<{
  ok: boolean;
  template?: ProgramTemplate;
  errors?: string[];
}> {
  const validation = await validateProgramForPublish(id);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const template = await updateProgramTemplate(id, { status: "active" });
  return { ok: true, template };
}

// ─────────────────────────────────────────────────────────────
// WEEK CRUD
// ─────────────────────────────────────────────────────────────

export async function addProgramWeek(
  programId: string,
  data: { label?: string; notes?: string },
): Promise<ProgramWeek> {
  const db = getDb();

  const rows = await db
    .select({ n: programWeeks.weekNumber })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, programId))
    .orderBy(sql`${programWeeks.weekNumber} DESC`)
    .limit(1);

  const nextWeek = (rows[0]?.n ?? 0) + 1;

  const [row] = await db
    .insert(programWeeks)
    .values({
      programTemplateId: programId,
      weekNumber: nextWeek,
      label: data.label ?? `Week ${nextWeek}`,
      notes: data.notes ?? null,
    })
    .returning();

  return row;
}

export async function updateProgramWeek(
  weekId: string,
  data: { label?: string; notes?: string | null },
): Promise<ProgramWeek> {
  const db = getDb();
  const [row] = await db
    .update(programWeeks)
    .set({
      label: data.label,
      notes: data.notes,
      updatedAt: new Date(),
    })
    .where(eq(programWeeks.id, weekId))
    .returning();
  return row;
}

export async function deleteProgramWeek(weekId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(programWeekDays)
    .where(eq(programWeekDays.programWeekId, weekId));
  await db.delete(programWeeks).where(eq(programWeeks.id, weekId));
}

// ─────────────────────────────────────────────────────────────
// DAY SLOT CRUD
// ─────────────────────────────────────────────────────────────

export async function setDayWorkout(
  weekId: string,
  dayOfWeek: number,
  workoutTemplateId: string | null,
  label?: string | null,
  notes?: string | null,
): Promise<ProgramWeekDay> {
  const db = getDb();

  // Upsert: if row exists for (weekId, dayOfWeek) update it, else insert
  const existing = await db
    .select()
    .from(programWeekDays)
    .where(
      sql`${programWeekDays.programWeekId} = ${weekId} AND ${programWeekDays.dayOfWeek} = ${dayOfWeek}`,
    )
    .limit(1);

  if (existing[0]) {
    const [row] = await db
      .update(programWeekDays)
      .set({
        workoutTemplateId,
        label: label ?? null,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(programWeekDays.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(programWeekDays)
    .values({
      programWeekId: weekId,
      dayOfWeek,
      workoutTemplateId,
      label: label ?? null,
      notes: notes ?? null,
    })
    .returning();
  return row;
}

export async function clearDayWorkout(weekId: string, dayOfWeek: number): Promise<void> {
  const db = getDb();
  await db
    .delete(programWeekDays)
    .where(
      sql`${programWeekDays.programWeekId} = ${weekId} AND ${programWeekDays.dayOfWeek} = ${dayOfWeek}`,
    );
}

// ─────────────────────────────────────────────────────────────
// FULL PROGRAM CONTENT
// ─────────────────────────────────────────────────────────────

export async function getProgramContent(
  programId: string,
): Promise<ProgramContent | null> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(programTemplates)
    .where(eq(programTemplates.id, programId))
    .limit(1);

  if (!template) return null;

  const weeks = await db
    .select()
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, programId))
    .orderBy(asc(programWeeks.weekNumber));

  if (weeks.length === 0) {
    return { template, weeks: [] };
  }

  const weekIds = weeks.map((w) => w.id);
  const days = await db
    .select({
      day: programWeekDays,
      workoutName: workoutTemplates.name,
      workoutStatus: workoutTemplates.status,
    })
    .from(programWeekDays)
    .leftJoin(
      workoutTemplates,
      eq(programWeekDays.workoutTemplateId, workoutTemplates.id),
    )
    .where(inArray(programWeekDays.programWeekId, weekIds));

  const daysByWeek = new Map<string, ProgramDayData[]>();
  for (const { day, workoutName, workoutStatus } of days) {
    const list = daysByWeek.get(day.programWeekId) ?? [];
    list.push({ day, workoutName, workoutStatus });
    daysByWeek.set(day.programWeekId, list);
  }

  const weekData: ProgramWeekData[] = weeks.map((week) => ({
    week,
    days: (daysByWeek.get(week.id) ?? []).sort(
      (a, b) => a.day.dayOfWeek - b.day.dayOfWeek,
    ),
  }));

  return { template, weeks: weekData };
}
