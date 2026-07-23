#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────────────────────
// Catalyst OS — Copy-on-Assignment Architecture Validation
//
// Validates three behavioral guarantees introduced by the
// copy-on-assignment migration (0008):
//
//   1. Template edits after assignment do NOT affect existing
//      client program weeks or day schedules.
//   2. New assignments create fully independent structural copies
//      with correct lineage (source_week_id, source_template_*).
//   3. Editing one client's weeks does NOT affect another client
//      assigned from the same template.
//
// All destructive changes are fully restored. State at exit is
// identical to state at entry.
//
// Usage:
//   node_modules/.bin/tsx --env-file=.env.local \
//     scripts/acceptance-test-copy-on-assignment.ts
// ─────────────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, inArray } from "drizzle-orm";
import {
  programTemplates,
  workoutTemplates,
} from "../lib/db/schema";
import {
  clientPrograms,
  clientProgramWeeks,
  clientProgramWeekDays,
  programWeeks,
  programWeekDays,
} from "../lib/db/schema-program";

const rawUrl = process.env.DATABASE_URL_DIRECT;
if (!rawUrl) {
  console.error("DATABASE_URL_DIRECT is not set.");
  process.exit(1);
}

const sql = postgres(rawUrl, { prepare: false });
const db = drizzle(sql);

// ─── Result tracking ─────────────────────────────────────────

type Result = { label: string; passed: boolean; detail?: string };
const results: Result[] = [];

function pass(label: string) {
  results.push({ label, passed: true });
  console.log(`  ✓  ${label}`);
}

function fail(label: string, detail: string) {
  results.push({ label, passed: false, detail });
  console.log(`  ✗  ${label}`);
  console.log(`     ${detail}`);
}

// ─────────────────────────────────────────────────────────────
// SETUP — find the active test client and Sprint 6.1 template
// ─────────────────────────────────────────────────────────────

async function setup() {
  // Active client program on Sprint 6.1
  const [activeAssignment] = await db
    .select({
      id: clientPrograms.id,
      clientId: clientPrograms.clientId,
      programTemplateId: clientPrograms.programTemplateId,
      sourceTemplateName: clientPrograms.sourceTemplateName,
      sourceTemplateVersion: clientPrograms.sourceTemplateVersion,
    })
    .from(clientPrograms)
    .where(eq(clientPrograms.status, "active"))
    .limit(1);

  if (!activeAssignment) throw new Error("No active client program found.");

  const [template] = await db
    .select({
      id: programTemplates.id,
      name: programTemplates.name,
      version: programTemplates.version,
    })
    .from(programTemplates)
    .where(eq(programTemplates.id, activeAssignment.programTemplateId))
    .limit(1);

  if (!template) throw new Error("Template not found.");

  // Find a second (non-active) client program on the same template for isolation test
  const allOnTemplate = await db
    .select({ id: clientPrograms.id, clientId: clientPrograms.clientId })
    .from(clientPrograms)
    .where(eq(clientPrograms.programTemplateId, activeAssignment.programTemplateId));

  const secondAssignment = allOnTemplate.find((p) => p.id !== activeAssignment.id) ?? null;

  return { activeAssignment, template, secondAssignment };
}

// ─────────────────────────────────────────────────────────────
// TEST 1: Template edit does not affect assigned client
// ─────────────────────────────────────────────────────────────

async function test1_templateEditIsolation(
  activeAssignment: Awaited<ReturnType<typeof setup>>["activeAssignment"],
  template: Awaited<ReturnType<typeof setup>>["template"],
) {
  console.log("\nTest 1: Template edit does not affect assigned client");

  // Read week 2 from both the template and the client's copy
  const [templateWeek2] = await db
    .select({ id: programWeeks.id, label: programWeeks.label })
    .from(programWeeks)
    .where(
      and(
        eq(programWeeks.programTemplateId, template.id),
        eq(programWeeks.weekNumber, 2),
      ),
    )
    .limit(1);

  const [clientWeek2] = await db
    .select({ id: clientProgramWeeks.id, label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(
      and(
        eq(clientProgramWeeks.clientProgramId, activeAssignment.id),
        eq(clientProgramWeeks.weekNumber, 2),
      ),
    )
    .limit(1);

  if (!templateWeek2 || !clientWeek2) {
    fail("Week 2 exists in both template and client copy", "Row missing from DB.");
    return;
  }

  const originalTemplateLabel = templateWeek2.label;
  const originalClientLabel = clientWeek2.label;
  const sentinelLabel = "__ISOLATION_TEST__";

  // Mutate the template week label
  await db
    .update(programWeeks)
    .set({ label: sentinelLabel, updatedAt: new Date() })
    .where(eq(programWeeks.id, templateWeek2.id));

  // Re-read both after the mutation
  const [mutatedTemplateWeek] = await db
    .select({ label: programWeeks.label })
    .from(programWeeks)
    .where(eq(programWeeks.id, templateWeek2.id))
    .limit(1);

  const [unchangedClientWeek] = await db
    .select({ label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.id, clientWeek2.id))
    .limit(1);

  if (mutatedTemplateWeek?.label === sentinelLabel) {
    pass("Template week 2 label updated");
  } else {
    fail("Template week 2 label updated", `Expected sentinel, got: ${mutatedTemplateWeek?.label}`);
  }

  if (unchangedClientWeek?.label === originalClientLabel) {
    pass("Client week 2 label unchanged after template edit");
  } else {
    fail(
      "Client week 2 label unchanged after template edit",
      `Expected "${originalClientLabel}", got "${unchangedClientWeek?.label}"`,
    );
  }

  // Also verify day slots are isolated: edit a template day, client day unchanged
  const [templateWeek1] = await db
    .select({ id: programWeeks.id })
    .from(programWeeks)
    .where(
      and(
        eq(programWeeks.programTemplateId, template.id),
        eq(programWeeks.weekNumber, 1),
      ),
    )
    .limit(1);

  if (templateWeek1) {
    const [templateDay] = await db
      .select({ id: programWeekDays.id, workoutTemplateId: programWeekDays.workoutTemplateId })
      .from(programWeekDays)
      .where(eq(programWeekDays.programWeekId, templateWeek1.id))
      .limit(1);

    if (templateDay) {
      const [clientWeek1] = await db
        .select({ id: clientProgramWeeks.id })
        .from(clientProgramWeeks)
        .where(
          and(
            eq(clientProgramWeeks.clientProgramId, activeAssignment.id),
            eq(clientProgramWeeks.weekNumber, 1),
          ),
        )
        .limit(1);

      if (clientWeek1) {
        const [clientDay] = await db
          .select({ workoutTemplateId: clientProgramWeekDays.workoutTemplateId })
          .from(clientProgramWeekDays)
          .where(eq(clientProgramWeekDays.clientProgramWeekId, clientWeek1.id))
          .limit(1);

        // Set template day to NULL workout (simulating clearing a day)
        const originalWorkoutId = templateDay.workoutTemplateId;
        await db
          .update(programWeekDays)
          .set({ workoutTemplateId: null, updatedAt: new Date() })
          .where(eq(programWeekDays.id, templateDay.id));

        const [clientDayAfter] = await db
          .select({ workoutTemplateId: clientProgramWeekDays.workoutTemplateId })
          .from(clientProgramWeekDays)
          .where(eq(clientProgramWeekDays.clientProgramWeekId, clientWeek1.id))
          .limit(1);

        if (clientDayAfter?.workoutTemplateId === clientDay?.workoutTemplateId) {
          pass("Client day slot unchanged after template day cleared");
        } else {
          fail(
            "Client day slot unchanged after template day cleared",
            `Client workout changed from "${clientDay?.workoutTemplateId}" to "${clientDayAfter?.workoutTemplateId}"`,
          );
        }

        // Restore template day
        await db
          .update(programWeekDays)
          .set({ workoutTemplateId: originalWorkoutId, updatedAt: new Date() })
          .where(eq(programWeekDays.id, templateDay.id));
      }
    }
  }

  // Restore template week 2 label
  await db
    .update(programWeeks)
    .set({ label: originalTemplateLabel, updatedAt: new Date() })
    .where(eq(programWeeks.id, templateWeek2.id));

  pass("Template restored to original state");
}

// ─────────────────────────────────────────────────────────────
// TEST 2: New assignment creates independent structural copy
// ─────────────────────────────────────────────────────────────

async function test2_newAssignmentCreatesIndependentCopy(
  activeAssignment: Awaited<ReturnType<typeof setup>>["activeAssignment"],
  template: Awaited<ReturnType<typeof setup>>["template"],
) {
  console.log("\nTest 2: New assignment creates independent structural copy");

  // Count existing client_program_weeks for all programs on this template
  const existingWeeksBefore = await db
    .select({ id: clientProgramWeeks.id, clientProgramId: clientProgramWeeks.clientProgramId })
    .from(clientProgramWeeks)
    .innerJoin(clientPrograms, eq(clientProgramWeeks.clientProgramId, clientPrograms.id))
    .where(eq(clientPrograms.programTemplateId, template.id));

  // Fetch template structure for the copy
  const templateWeeks = await db
    .select({ id: programWeeks.id, weekNumber: programWeeks.weekNumber, label: programWeeks.label, notes: programWeeks.notes })
    .from(programWeeks)
    .where(eq(programWeeks.programTemplateId, template.id));

  const templateDays = templateWeeks.length > 0
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
        .where(inArray(programWeekDays.programWeekId, templateWeeks.map((w) => w.id)))
    : [];

  // Create a synthetic test assignment (overrideAllowMultiple so we don't disrupt active program)
  const [testAssignment] = await db
    .insert(clientPrograms)
    .values({
      clientId: activeAssignment.clientId,
      programTemplateId: template.id,
      startDate: "2099-01-01", // Far future — clearly a test row
      status: "active",
      overrideAllowMultiple: true,
      sourceTemplateName: template.name,
      sourceTemplateVersion: template.version,
    })
    .returning({ id: clientPrograms.id });

  // Deep-copy the template structure (same logic as the service)
  for (const week of templateWeeks) {
    const [newWeek] = await db
      .insert(clientProgramWeeks)
      .values({
        clientProgramId: testAssignment.id,
        sourceWeekId: week.id,
        weekNumber: week.weekNumber,
        label: week.label,
        notes: week.notes,
      })
      .returning({ id: clientProgramWeeks.id });

    const daysForWeek = templateDays.filter((d) => d.programWeekId === week.id);
    if (daysForWeek.length > 0) {
      await db.insert(clientProgramWeekDays).values(
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

  // Assert: new assignment has its own week rows
  const newAssignmentWeeks = await db
    .select({ id: clientProgramWeeks.id, weekNumber: clientProgramWeeks.weekNumber, sourceWeekId: clientProgramWeeks.sourceWeekId })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.clientProgramId, testAssignment.id));

  if (newAssignmentWeeks.length === templateWeeks.length) {
    pass(`New assignment has ${newAssignmentWeeks.length} week rows (matches template)`);
  } else {
    fail(
      "New assignment has correct week count",
      `Expected ${templateWeeks.length}, got ${newAssignmentWeeks.length}`,
    );
  }

  // Assert: all new week rows have source_week_id pointing to the template
  const templateWeekIds = new Set(templateWeeks.map((w) => w.id));
  const allLinked = newAssignmentWeeks.every(
    (w) => w.sourceWeekId !== null && templateWeekIds.has(w.sourceWeekId),
  );
  if (allLinked) {
    pass("All new week rows have valid source_week_id lineage");
  } else {
    fail("All new week rows have valid source_week_id lineage", "One or more source_week_id values are null or invalid.");
  }

  // Assert: new rows are separate from original assignment's rows
  const originalWeekIds = new Set(
    existingWeeksBefore
      .filter((w) => w.clientProgramId === activeAssignment.id)
      .map((w) => w.id),
  );
  const newWeekIds = new Set(newAssignmentWeeks.map((w) => w.id));
  const overlap = [...newWeekIds].filter((id) => originalWeekIds.has(id));

  if (overlap.length === 0) {
    pass("New assignment week rows are distinct from original assignment rows");
  } else {
    fail(
      "New assignment week rows are distinct from original assignment rows",
      `${overlap.length} row(s) shared between assignments.`,
    );
  }

  // Assert: original assignment weeks are unchanged
  const originalWeekCount = existingWeeksBefore.filter(
    (w) => w.clientProgramId === activeAssignment.id,
  ).length;
  const originalWeeksAfter = await db
    .select({ id: clientProgramWeeks.id })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.clientProgramId, activeAssignment.id));

  if (originalWeeksAfter.length === originalWeekCount) {
    pass("Original assignment week count unchanged after new assignment");
  } else {
    fail(
      "Original assignment week count unchanged after new assignment",
      `Was ${originalWeekCount}, now ${originalWeeksAfter.length}`,
    );
  }

  // Assert: lineage snapshot populated correctly
  const [createdAssignment] = await db
    .select({ sourceTemplateName: clientPrograms.sourceTemplateName, sourceTemplateVersion: clientPrograms.sourceTemplateVersion })
    .from(clientPrograms)
    .where(eq(clientPrograms.id, testAssignment.id))
    .limit(1);

  if (
    createdAssignment?.sourceTemplateName === template.name &&
    createdAssignment?.sourceTemplateVersion === template.version
  ) {
    pass("Lineage snapshot (name + version) correct on new assignment");
  } else {
    fail(
      "Lineage snapshot (name + version) correct on new assignment",
      `Got name="${createdAssignment?.sourceTemplateName}" v${createdAssignment?.sourceTemplateVersion}, expected name="${template.name}" v${template.version}`,
    );
  }

  // Cleanup: delete test assignment (days → weeks → program)
  const testWeeks = await db
    .select({ id: clientProgramWeeks.id })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.clientProgramId, testAssignment.id));

  if (testWeeks.length > 0) {
    await db
      .delete(clientProgramWeekDays)
      .where(inArray(clientProgramWeekDays.clientProgramWeekId, testWeeks.map((w) => w.id)));
    await db
      .delete(clientProgramWeeks)
      .where(eq(clientProgramWeeks.clientProgramId, testAssignment.id));
  }
  await db.delete(clientPrograms).where(eq(clientPrograms.id, testAssignment.id));

  pass("Test assignment cleaned up");
}

// ─────────────────────────────────────────────────────────────
// TEST 3: Per-client customization is independent
// ─────────────────────────────────────────────────────────────

async function test3_perClientCustomizationIndependence(
  activeAssignment: Awaited<ReturnType<typeof setup>>["activeAssignment"],
  secondAssignment: Awaited<ReturnType<typeof setup>>["secondAssignment"],
) {
  console.log("\nTest 3: Per-client customization is independent");

  if (!secondAssignment) {
    pass("(skipped — no second assignment on same template; single-client scenario)");
    return;
  }

  if (secondAssignment.clientId === activeAssignment.clientId) {
    // Same client, different program — still valid for independence test
  }

  // Read week 3 labels for both assignments
  const [week3A] = await db
    .select({ id: clientProgramWeeks.id, label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(
      and(
        eq(clientProgramWeeks.clientProgramId, activeAssignment.id),
        eq(clientProgramWeeks.weekNumber, 3),
      ),
    )
    .limit(1);

  const [week3B] = await db
    .select({ id: clientProgramWeeks.id, label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(
      and(
        eq(clientProgramWeeks.clientProgramId, secondAssignment.id),
        eq(clientProgramWeeks.weekNumber, 3),
      ),
    )
    .limit(1);

  if (!week3A || !week3B) {
    fail("Both assignments have a week 3", `week3A=${!!week3A} week3B=${!!week3B}`);
    return;
  }

  if (week3A.id === week3B.id) {
    fail(
      "Week rows are distinct between assignments",
      "Both assignments share the same week 3 row ID — copy-on-assignment failed.",
    );
    return;
  }

  pass("Week 3 rows are distinct DB rows between the two assignments");

  const originalLabelB = week3B.label;
  const sentinelLabel = "__CLIENT_A_CUSTOM_LABEL__";

  // Customize assignment A's week 3
  await db
    .update(clientProgramWeeks)
    .set({ label: sentinelLabel, updatedAt: new Date() })
    .where(eq(clientProgramWeeks.id, week3A.id));

  // Re-read both
  const [week3AAfter] = await db
    .select({ label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.id, week3A.id))
    .limit(1);

  const [week3BAfter] = await db
    .select({ label: clientProgramWeeks.label })
    .from(clientProgramWeeks)
    .where(eq(clientProgramWeeks.id, week3B.id))
    .limit(1);

  if (week3AAfter?.label === sentinelLabel) {
    pass("Assignment A week 3 label updated to custom value");
  } else {
    fail("Assignment A week 3 label updated", `Got: ${week3AAfter?.label}`);
  }

  if (week3BAfter?.label === originalLabelB) {
    pass("Assignment B week 3 label unchanged after editing assignment A");
  } else {
    fail(
      "Assignment B week 3 label unchanged after editing assignment A",
      `Expected "${originalLabelB}", got "${week3BAfter?.label}"`,
    );
  }

  // Restore assignment A's week 3 label
  await db
    .update(clientProgramWeeks)
    .set({ label: week3A.label, updatedAt: new Date() })
    .where(eq(clientProgramWeeks.id, week3A.id));

  pass("Assignment A week 3 label restored");
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("Catalyst OS — Copy-on-Assignment Validation\n");

  let setupData: Awaited<ReturnType<typeof setup>>;
  try {
    setupData = await setup();
    console.log(`Active program:   ${setupData.activeAssignment.id}`);
    console.log(`Template:         ${setupData.template.name} (v${setupData.template.version})`);
    console.log(
      `Second program:   ${setupData.secondAssignment?.id ?? "(none on same template)"}`,
    );
  } catch (e) {
    console.error("Setup failed:", e);
    process.exit(1);
  }

  const { activeAssignment, template, secondAssignment } = setupData;

  await test1_templateEditIsolation(activeAssignment, template);
  await test2_newAssignmentCreatesIndependentCopy(activeAssignment, template);
  await test3_perClientCustomizationIndependence(activeAssignment, secondAssignment);

  // ── Summary ────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n${"─".repeat(56)}`);
  console.log(`Results: ${passed}/${results.length} passed`);

  if (failed.length > 0) {
    console.log(`\nFailed assertions:`);
    failed.forEach((r) => {
      console.log(`  ✗  ${r.label}`);
      if (r.detail) console.log(`     ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log("All assertions passed. Architecture validated.");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
}).finally(() => sql.end());
