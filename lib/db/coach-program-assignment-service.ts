// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Coach Program Assignment Service (Sprint 6.3A)
//
// SERVER-ONLY — never import from a Client Component.
//
// Handles:
//   - Listing publishable blueprints with Week 1 preview data
//   - Archiving the current active program and creating a new one
//   - Fetching the client's full program history
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, and, desc, asc, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "./client";
import { users, programTemplates, workoutTemplates, timelineEvents as timelineEventsTable } from "./schema";
import {
  clientPrograms,
  clientProgramWeeks,
  clientProgramWeekDays,
  programWeeks,
  programWeekDays,
} from "./schema-program";

// ─────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────

export interface Week1DayPreview {
  dayOfWeek: number; // 0 = Sun … 6 = Sat
  workoutName: string;
  estimatedMinutes: number | null;
}

export interface BlueprintForAssignment {
  id: string;
  name: string;
  category: string;
  experienceLevel: string;
  description: string | null;
  recommendedDaysPerWeek: number | null;
  defaultDurationWeeks: number | null;
  week1Preview: Week1DayPreview[];
  estimatedWeeklyMinutes: number | null;
}

export interface ProgramHistoryItem {
  id: string;
  programName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  assignedAt: string; // ISO string — serializable for client
  coachNotes: string | null;
  totalWeeks: number | null;
}

// ─────────────────────────────────────────────────────────────
// LIST ASSIGNABLE BLUEPRINTS
//
// Returns all published (status='active') program templates with
// a Week 1 preview so the coach can preview before assigning.
// ─────────────────────────────────────────────────────────────

export async function listAssignableBlueprints(): Promise<BlueprintForAssignment[]> {
  const db = getDb();

  const templates = await db
    .select({
      id: programTemplates.id,
      name: programTemplates.name,
      category: programTemplates.category,
      experienceLevel: programTemplates.experienceLevel,
      description: programTemplates.description,
      recommendedDaysPerWeek: programTemplates.recommendedDaysPerWeek,
      defaultDurationWeeks: programTemplates.defaultDurationWeeks,
    })
    .from(programTemplates)
    .where(eq(programTemplates.status, "active"))
    .orderBy(asc(programTemplates.name));

  if (templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);

  // Fetch week 1 IDs for each template
  const week1Rows = await db
    .select({
      templateId: programWeeks.programTemplateId,
      weekId: programWeeks.id,
    })
    .from(programWeeks)
    .where(
      and(
        inArray(programWeeks.programTemplateId, templateIds),
        eq(programWeeks.weekNumber, 1),
      ),
    );

  const week1Ids = week1Rows.map((w) => w.weekId);

  // Fetch training days for those week 1 rows
  const dayRows =
    week1Ids.length > 0
      ? await db
          .select({
            weekId: programWeekDays.programWeekId,
            dayOfWeek: programWeekDays.dayOfWeek,
            workoutName: workoutTemplates.name,
            estimatedMinutes: workoutTemplates.estimatedDurationMinutes,
          })
          .from(programWeekDays)
          .innerJoin(
            workoutTemplates,
            eq(programWeekDays.workoutTemplateId, workoutTemplates.id),
          )
          .where(
            and(
              inArray(programWeekDays.programWeekId, week1Ids),
              isNotNull(programWeekDays.workoutTemplateId),
            ),
          )
      : ([] as { weekId: string; dayOfWeek: number; workoutName: string; estimatedMinutes: number | null }[]);

  // Build lookup maps
  const week1ByTemplate = new Map<string, string>();
  for (const w of week1Rows) {
    week1ByTemplate.set(w.templateId, w.weekId);
  }

  const daysByWeekId = new Map<string, typeof dayRows>();
  for (const d of dayRows) {
    const list = daysByWeekId.get(d.weekId) ?? [];
    list.push(d);
    daysByWeekId.set(d.weekId, list);
  }

  return templates.map((t) => {
    const weekId = week1ByTemplate.get(t.id);
    const days = weekId ? (daysByWeekId.get(weekId) ?? []) : [];
    const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    const estimatedWeeklyMinutes =
      sorted.reduce((s, d) => s + (d.estimatedMinutes ?? 0), 0) || null;

    return {
      id: t.id,
      name: t.name,
      category: t.category,
      experienceLevel: t.experienceLevel,
      description: t.description,
      recommendedDaysPerWeek: t.recommendedDaysPerWeek,
      defaultDurationWeeks: t.defaultDurationWeeks,
      week1Preview: sorted.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        workoutName: d.workoutName,
        estimatedMinutes: d.estimatedMinutes,
      })),
      estimatedWeeklyMinutes,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// GET CLIENT PROGRAM HISTORY
//
// All assignments for a client, newest first. Used to populate
// the Program History section beneath the active timeline.
// ─────────────────────────────────────────────────────────────

export async function getClientProgramHistory(
  clientId: string,
): Promise<ProgramHistoryItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: clientPrograms.id,
      programName: programTemplates.name,
      status: clientPrograms.status,
      startDate: clientPrograms.startDate,
      endDate: clientPrograms.endDate,
      assignedAt: clientPrograms.createdAt,
      coachNotes: clientPrograms.coachNotes,
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
    id: r.id,
    programName: r.programName,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
    assignedAt: r.assignedAt.toISOString(),
    coachNotes: r.coachNotes,
    totalWeeks: r.totalWeeks,
  }));
}

// ─────────────────────────────────────────────────────────────
// ARCHIVE + ASSIGN
//
// Archives any current active program (status='cancelled',
// endDate=newStartDate) then creates a new active assignment —
// both within a single transaction so a failure on the INSERT
// never leaves the client without an active program.
//
// Security: clientId must resolve to a user with role='client'.
// The server action caller is responsible for auth before invoking.
// ─────────────────────────────────────────────────────────────

export async function archiveAndAssignProgram({
  clientId,
  programTemplateId,
  startDate,
  coachNotes,
}: {
  clientId: string;
  programTemplateId: string;
  startDate: string;
  coachNotes?: string | null;
}): Promise<{ ok: boolean; error?: string; assignmentId?: string }> {
  const db = getDb();

  // Pre-validate: target must be a role='client' user.
  const [client] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, clientId))
    .limit(1);

  if (!client || client.role !== "client") {
    return { ok: false, error: "Client not found." };
  }

  // Pre-validate: template must be published.
  // Fetch name + version here so the lineage snapshot is populated on the
  // new client_programs row without an extra query inside the transaction.
  const [tmpl] = await db
    .select({
      name: programTemplates.name,
      status: programTemplates.status,
      version: programTemplates.version,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, programTemplateId))
    .limit(1);

  if (!tmpl) return { ok: false, error: "Program template not found." };
  if (tmpl.status !== "active") {
    return {
      ok: false,
      error: `Program "${tmpl.name}" is not published. Publish it before assigning.`,
    };
  }

  // Fetch template structure outside the transaction — read-only, no locking needed.
  const templateWeeks = await db
    .select({
      id: programWeeks.id,
      weekNumber: programWeeks.weekNumber,
      label: programWeeks.label,
      notes: programWeeks.notes,
    })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, programTemplateId))
    .orderBy(asc(programWeeks.weekNumber));

  const templateDays =
    templateWeeks.length > 0
      ? await db
          .select({
            id: programWeekDays.id,
            programWeekId: programWeekDays.programWeekId,
            dayOfWeek: programWeekDays.dayOfWeek,
            workoutTemplateId: programWeekDays.workoutTemplateId,
            label: programWeekDays.label,
            notes: programWeekDays.notes,
          })
          .from(programWeekDays)
          .where(
            inArray(
              programWeekDays.programWeekId,
              templateWeeks.map((w) => w.id),
            ),
          )
      : [];

  // Archive existing program + create new one + deep-copy structure atomically.
  // If any step fails the entire transaction rolls back — the client is never
  // left with a client_programs row and no structural week data.
  try {
    const assignmentId = await db.transaction(async (tx) => {
      // Lock & archive any existing active program.
      const [existing] = await tx
        .select({ id: clientPrograms.id })
        .from(clientPrograms)
        .where(
          and(
            eq(clientPrograms.clientId, clientId),
            eq(clientPrograms.status, "active"),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(clientPrograms)
          .set({ status: "cancelled", endDate: startDate, updatedAt: new Date() })
          .where(eq(clientPrograms.id, existing.id));
      }

      // Insert the new active assignment with lineage snapshot.
      const [newAssignment] = await tx
        .insert(clientPrograms)
        .values({
          clientId,
          programTemplateId,
          startDate,
          coachNotes: coachNotes ?? null,
          overrideAllowMultiple: false,
          status: "active",
          sourceTemplateName: tmpl.name,
          sourceTemplateVersion: tmpl.version,
        })
        .returning({ id: clientPrograms.id });

      // Deep-copy scheduling structure into client-owned rows.
      for (const week of templateWeeks) {
        const [newWeek] = await tx
          .insert(clientProgramWeeks)
          .values({
            clientProgramId: newAssignment.id,
            sourceWeekId: week.id,
            weekNumber: week.weekNumber,
            label: week.label,
            notes: week.notes,
          })
          .returning({ id: clientProgramWeeks.id });

        const daysForWeek = templateDays.filter(
          (d) => d.programWeekId === week.id,
        );
        if (daysForWeek.length > 0) {
          await tx.insert(clientProgramWeekDays).values(
            daysForWeek.map((d) => ({
              clientProgramWeekId: newWeek.id,
              sourceDayId: d.id,
              dayOfWeek: d.dayOfWeek,
              workoutTemplateId: d.workoutTemplateId,
              label: d.label,
              notes: d.notes,
            })),
          );
        }
      }

      // Record timeline event.
      await tx.insert(timelineEventsTable).values({
        clientId,
        eventType: "program_assigned",
        actorRole: "coach",
        title: `Program assigned: ${tmpl.name}`,
        description: `Started ${startDate}${existing ? " · previous program archived" : ""}`,
        occurredAt: new Date(),
      });

      return newAssignment.id;
    });

    return { ok: true, assignmentId };
  } catch (err) {
    // Unique constraint violation on uq_client_active_program means two
    // concurrent submissions raced; the second one lost. Return a safe
    // user-facing message instead of propagating the raw DB error.
    if (
      err instanceof Error &&
      ((err as unknown as Record<string, unknown>).code === "23505" ||
        err.message.includes("uq_client_active_program"))
    ) {
      return {
        ok: false,
        error: "A program was just assigned to this client. Refresh and try again.",
      };
    }
    throw err;
  }
}
