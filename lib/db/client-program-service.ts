// ─────────────────────────────────────────────────────────────
// Catalyst OS — Client Program Service (Sprint 6.0)
//
// SERVER-ONLY — never import from a Client Component.
// Handles program assignment to clients, the single-active-program
// rule, and the "today's workout" lookup logic.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, and, asc, desc, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "./client";
import {
  programTemplates,
  workoutTemplates,
  clientProfiles,
} from "./schema";
import {
  clientPrograms,
  programWeeks,
  programWeekDays,
  workoutSessions,
  type ClientProgram,
  type ClientProgramStatus,
} from "./schema-program";
import {
  workoutTemplateSections,
  workoutTemplateExercises,
  exercises,
} from "./schema-exercise";

// ─────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────

export interface ExerciseSnapshotItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  groupId: string | null;
  groupPosition: number | null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  targetRpe: string | null;
  targetRir: string | null;
  setTechnique: string | null;
  coachNotes: string | null;
  isRequired: boolean;
}

export interface SectionSnapshot {
  id: string;
  name: string;
  sectionType: string;
  orderIndex: number;
  estimatedMinutes: number | null;
  exercises: ExerciseSnapshotItem[];
}

export interface WorkoutSnapshot {
  templateId: string;
  templateName: string;
  estimatedDurationMinutes: number | null;
  sections: SectionSnapshot[];
  unsectioned: ExerciseSnapshotItem[];
}

export interface TodayWorkout {
  clientProgramId: string;
  programName: string;
  weekNumber: number;
  dayOfWeek: number;
  totalWeeks: number;
  workoutTemplateId: string;
  workoutName: string;
  estimatedDurationMinutes: number | null;
  scheduledDate: string;
  existingSessionId: string | null;
  existingSessionStatus: string | null;
  snapshot: WorkoutSnapshot;
}

export interface NotStartedData {
  programName: string;
  startDate: string;
  daysUntilStart: number;
  totalWeeks: number | null;
}

export type TodayResult =
  | { kind: "workout"; data: TodayWorkout }
  | { kind: "rest_day" }
  | { kind: "no_program" }
  | { kind: "program_complete" }
  | { kind: "not_started"; data: NotStartedData };

export interface AssignProgramInput {
  clientId: string;
  programTemplateId: string;
  startDate: string;
  enrollmentId?: string | null;
  coachNotes?: string | null;
  overrideAllowMultiple?: boolean;
}

export interface ClientProgramWithMeta {
  assignment: ClientProgram;
  programName: string;
  programCategory: string;
  clientName: string;
  totalWeeks: number | null;
}

export interface ComplianceSummary {
  clientId: string;
  clientName: string;
  programName: string;
  weekNumber: number;
  totalWeeks: number | null;
  scheduledSessions: number;
  completedSessions: number;
  compliancePercent: number;
  lastCompletedAt: Date | null;
  nextScheduledDate: string | null;
  assignmentId: string;
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT CRUD
// ─────────────────────────────────────────────────────────────

export async function assignProgram(
  input: AssignProgramInput,
): Promise<{ ok: boolean; assignment?: ClientProgram; error?: string }> {
  const db = getDb();

  // Enforce single-active-program rule unless override is set
  if (!input.overrideAllowMultiple) {
    const existing = await db
      .select({ id: clientPrograms.id })
      .from(clientPrograms)
      .where(
        and(
          eq(clientPrograms.clientId, input.clientId),
          eq(clientPrograms.status, "active"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error:
          "Client already has an active program. Deactivate it first, or use overrideAllowMultiple.",
      };
    }
  }

  // Confirm the program template is published (status='active')
  const [tmpl] = await db
    .select({ status: programTemplates.status, name: programTemplates.name })
    .from(programTemplates)
    .where(eq(programTemplates.id, input.programTemplateId))
    .limit(1);

  if (!tmpl) return { ok: false, error: "Program template not found." };
  if (tmpl.status !== "active") {
    return {
      ok: false,
      error: `Program "${tmpl.name}" is not published. Publish it before assigning.`,
    };
  }

  const [row] = await db
    .insert(clientPrograms)
    .values({
      clientId: input.clientId,
      programTemplateId: input.programTemplateId,
      startDate: input.startDate,
      enrollmentId: input.enrollmentId ?? null,
      coachNotes: input.coachNotes ?? null,
      overrideAllowMultiple: input.overrideAllowMultiple ?? false,
      status: "active",
    })
    .returning();

  return { ok: true, assignment: row };
}

export async function updateClientProgram(
  id: string,
  data: {
    status?: ClientProgramStatus;
    endDate?: string | null;
    coachNotes?: string | null;
  },
): Promise<ClientProgram> {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) updates.status = data.status;
  if (data.endDate !== undefined) updates.endDate = data.endDate;
  if (data.coachNotes !== undefined) updates.coachNotes = data.coachNotes;

  const [row] = await db
    .update(clientPrograms)
    .set(updates)
    .where(eq(clientPrograms.id, id))
    .returning();
  return row;
}

export async function getClientActiveProgram(
  clientId: string,
): Promise<ClientProgram | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clientPrograms)
    .where(
      and(
        eq(clientPrograms.clientId, clientId),
        eq(clientPrograms.status, "active"),
      ),
    )
    .orderBy(desc(clientPrograms.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listClientPrograms(
  clientId: string,
): Promise<ClientProgramWithMeta[]> {
  const db = getDb();
  const rows = await db
    .select({
      assignment: clientPrograms,
      programName: programTemplates.name,
      programCategory: programTemplates.category,
      totalWeeks: programTemplates.defaultDurationWeeks,
    })
    .from(clientPrograms)
    .innerJoin(
      programTemplates,
      eq(clientPrograms.programTemplateId, programTemplates.id),
    )
    .where(eq(clientPrograms.clientId, clientId))
    .orderBy(desc(clientPrograms.createdAt));

  return rows.map((r) => ({
    assignment: r.assignment,
    programName: r.programName,
    programCategory: r.programCategory,
    clientName: "",
    totalWeeks: r.totalWeeks,
  }));
}

export async function listAllActiveAssignments(): Promise<
  ClientProgramWithMeta[]
> {
  const db = getDb();
  const rows = await db
    .select({
      assignment: clientPrograms,
      programName: programTemplates.name,
      programCategory: programTemplates.category,
      totalWeeks: programTemplates.defaultDurationWeeks,
      fullName: clientProfiles.fullName,
      preferredName: clientProfiles.preferredName,
    })
    .from(clientPrograms)
    .innerJoin(
      programTemplates,
      eq(clientPrograms.programTemplateId, programTemplates.id),
    )
    .leftJoin(
      clientProfiles,
      eq(clientPrograms.clientId, clientProfiles.userId),
    )
    .where(eq(clientPrograms.status, "active"))
    .orderBy(asc(clientPrograms.startDate));

  return rows.map((r) => ({
    assignment: r.assignment,
    programName: r.programName,
    programCategory: r.programCategory,
    clientName:
      r.preferredName ?? r.fullName ?? r.assignment.clientId,
    totalWeeks: r.totalWeeks,
  }));
}

// ─────────────────────────────────────────────────────────────
// SNAPSHOT BUILDER
//
// Freezes the full workout structure into a JSONB-ready object
// at session-creation time. Preserves historical fidelity even
// if the blueprint is later edited.
// ─────────────────────────────────────────────────────────────

export async function buildWorkoutSnapshot(
  workoutTemplateId: string,
): Promise<WorkoutSnapshot> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.id, workoutTemplateId))
    .limit(1);

  if (!template) throw new Error("Workout template not found");

  const sections = await db
    .select()
    .from(workoutTemplateSections)
    .where(eq(workoutTemplateSections.workoutTemplateId, workoutTemplateId))
    .orderBy(asc(workoutTemplateSections.orderIndex));

  const prescriptions = await db
    .select({
      p: workoutTemplateExercises,
      exerciseName: exercises.name,
    })
    .from(workoutTemplateExercises)
    .innerJoin(exercises, eq(workoutTemplateExercises.exerciseId, exercises.id))
    .where(
      eq(workoutTemplateExercises.workoutTemplateId, workoutTemplateId),
    )
    .orderBy(asc(workoutTemplateExercises.orderIndex));

  function toItem(
    p: (typeof prescriptions)[0]["p"],
    name: string,
  ): ExerciseSnapshotItem {
    return {
      id: p.id,
      exerciseId: p.exerciseId,
      exerciseName: name,
      orderIndex: p.orderIndex,
      groupId: p.groupId,
      groupPosition: p.groupPosition,
      sets: p.sets,
      repsMin: p.repsMin,
      repsMax: p.repsMax,
      durationSeconds: p.durationSeconds,
      restSeconds: p.restSeconds,
      tempo: p.tempo,
      targetRpe: p.targetRpe ? String(p.targetRpe) : null,
      targetRir: p.targetRir ? String(p.targetRir) : null,
      setTechnique: p.setTechnique,
      coachNotes: p.coachNotes,
      isRequired: p.isRequired,
    };
  }

  const sectionSnapshots: SectionSnapshot[] = sections.map((sec) => {
    const secExercises = prescriptions
      .filter((p) => p.p.sectionId === sec.id)
      .map(({ p, exerciseName }) => toItem(p, exerciseName))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      id: sec.id,
      name: sec.name,
      sectionType: sec.sectionType,
      orderIndex: sec.orderIndex,
      estimatedMinutes: sec.estimatedMinutes,
      exercises: secExercises,
    };
  });

  const unsectioned = prescriptions
    .filter((p) => p.p.sectionId === null)
    .map(({ p, exerciseName }) => toItem(p, exerciseName))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return {
    templateId: workoutTemplateId,
    templateName: template.name,
    estimatedDurationMinutes: template.estimatedDurationMinutes,
    sections: sectionSnapshots,
    unsectioned,
  };
}

// ─────────────────────────────────────────────────────────────
// TODAY'S WORKOUT LOOKUP
//
// Resolves which workout (if any) the client should do today
// based on their active program and today's calendar date.
//
// Week calculation:
//   weekNumber = floor(daysBetween(startDate, today) / 7) + 1
//   dayOfWeek  = today.getDay()   (0=Sun … 6=Sat)
//
// Returns a tagged union so callers can handle each case:
//   workout       — a specific blueprint is scheduled today
//   rest_day      — program has this day as rest
//   no_program    — client has no active program
//   program_complete — past the last week of the program
//   not_started   — program start date is in the future
// ─────────────────────────────────────────────────────────────

function daysBetween(from: string, to: Date): number {
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(
    to.toISOString().slice(0, 10) + "T00:00:00Z",
  );
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export async function getTodayWorkout(
  clientId: string,
): Promise<TodayResult> {
  const db = getDb();

  const assignment = await getClientActiveProgram(clientId);
  if (!assignment) return { kind: "no_program" };

  // Fetch template early — needed for not_started data and program_complete check.
  const [tmpl] = await db
    .select({
      name: programTemplates.name,
      totalWeeks: programTemplates.defaultDurationWeeks,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, assignment.programTemplateId))
    .limit(1);

  if (!tmpl) return { kind: "no_program" };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const elapsed = daysBetween(assignment.startDate, today);

  if (elapsed < 0) {
    return {
      kind: "not_started",
      data: {
        programName: tmpl.name,
        startDate: assignment.startDate,
        daysUntilStart: Math.abs(elapsed),
        totalWeeks: tmpl.totalWeeks,
      },
    };
  }

  const weekNumber = Math.floor(elapsed / 7) + 1;
  const dayOfWeek = today.getDay();

  if (tmpl.totalWeeks !== null && weekNumber > tmpl.totalWeeks) {
    return { kind: "program_complete" };
  }

  // Find the program week
  const [week] = await db
    .select()
    .from(programWeeks)
    .where(
      and(
        eq(programWeeks.programTemplateId, assignment.programTemplateId),
        eq(programWeeks.weekNumber, weekNumber),
      ),
    )
    .limit(1);

  if (!week) return { kind: "rest_day" };

  // Find the day slot
  const [daySlot] = await db
    .select()
    .from(programWeekDays)
    .where(
      and(
        eq(programWeekDays.programWeekId, week.id),
        eq(programWeekDays.dayOfWeek, dayOfWeek),
      ),
    )
    .limit(1);

  if (!daySlot || !daySlot.workoutTemplateId) return { kind: "rest_day" };

  // Fetch workout template metadata
  const [wt] = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.id, daySlot.workoutTemplateId))
    .limit(1);

  if (!wt) return { kind: "rest_day" };

  // Check for an existing session today
  const [existingSession] = await db
    .select({ id: workoutSessions.id, status: workoutSessions.status })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        eq(workoutSessions.scheduledDate, todayStr),
        eq(workoutSessions.workoutTemplateId, daySlot.workoutTemplateId),
      ),
    )
    .orderBy(desc(workoutSessions.createdAt))
    .limit(1);

  const snapshot = await buildWorkoutSnapshot(daySlot.workoutTemplateId);

  return {
    kind: "workout",
    data: {
      clientProgramId: assignment.id,
      programName: tmpl.name,
      weekNumber,
      dayOfWeek,
      totalWeeks: tmpl.totalWeeks ?? 0,
      workoutTemplateId: daySlot.workoutTemplateId,
      workoutName: wt.name,
      estimatedDurationMinutes: wt.estimatedDurationMinutes,
      scheduledDate: todayStr,
      existingSessionId: existingSession?.id ?? null,
      existingSessionStatus: existingSession?.status ?? null,
      snapshot,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// COACH DASHBOARD — COMPLIANCE METRICS
// ─────────────────────────────────────────────────────────────

export async function getComplianceSummary(
  clientId: string,
): Promise<ComplianceSummary | null> {
  const db = getDb();

  const assignment = await getClientActiveProgram(clientId);
  if (!assignment) return null;

  const [tmpl] = await db
    .select({
      name: programTemplates.name,
      totalWeeks: programTemplates.defaultDurationWeeks,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, assignment.programTemplateId))
    .limit(1);

  const [profile] = await db
    .select({
      fullName: clientProfiles.fullName,
      preferredName: clientProfiles.preferredName,
    })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);

  if (!tmpl) return null;

  const today = new Date();
  const elapsed = daysBetween(assignment.startDate, today);
  const weekNumber = Math.max(1, Math.floor(elapsed / 7) + 1);

  // Count scheduled sessions: days with workout_template_id in weeks 1..weekNumber
  const weeks = await db
    .select({ id: programWeeks.id, weekNumber: programWeeks.weekNumber })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, assignment.programTemplateId));

  const pastWeekIds = weeks
    .filter((w) => w.weekNumber <= weekNumber)
    .map((w) => w.id);

  let scheduledCount = 0;
  if (pastWeekIds.length > 0) {
    const dayRows = await db
      .select({ id: programWeekDays.id })
      .from(programWeekDays)
      .where(
        and(
          inArray(programWeekDays.programWeekId, pastWeekIds),
          isNotNull(programWeekDays.workoutTemplateId),
        ),
      );
    scheduledCount = dayRows.length;
  }

  // Count completed sessions
  const sessions = await db
    .select({
      status: workoutSessions.status,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        eq(workoutSessions.clientProgramId, assignment.id),
      ),
    )
    .orderBy(desc(workoutSessions.completedAt));

  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const lastCompletedAt =
    sessions.find((s) => s.status === "completed")?.completedAt ?? null;

  const compliancePercent =
    scheduledCount > 0
      ? Math.round((completedSessions / scheduledCount) * 100)
      : 0;

  return {
    clientId,
    clientName:
      profile?.preferredName ?? profile?.fullName ?? clientId,
    programName: tmpl.name,
    weekNumber,
    totalWeeks: tmpl.totalWeeks,
    scheduledSessions: scheduledCount,
    completedSessions,
    compliancePercent,
    lastCompletedAt,
    nextScheduledDate: null, // future enhancement
    assignmentId: assignment.id,
  };
}
