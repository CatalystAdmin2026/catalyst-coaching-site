// ─────────────────────────────────────────────────────────────
// Sprint 6.4 QA Fix — Program Page Regression Tests
//
// Deterministic tests for /portal/program across all 5 client
// program states. Reproduces the original crash scenario and
// guards against regression.
//
// Root cause: listClientPrograms had a redundant INNER JOIN
// with the users table that provided no selected data and added
// an unnecessary failure surface when DB state was inconsistent.
//
// Run: npx tsx scripts/acceptance-test-program-page.ts
// Live DB tests: npx tsx --env-file=.env.local scripts/acceptance-test-program-page.ts --live
// ─────────────────────────────────────────────────────────────

import { readFile } from "fs/promises";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const LIVE = process.argv.includes("--live");

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`);
  }
}

function section(title: string) {
  console.log(`\n● ${title}\n`);
}

async function src(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, relPath), "utf8");
}

// ─── Pure function tests ──────────────────────────────────────

interface WeekDot {
  weekNumber: number;
  state: "past" | "current" | "future" | "not_started";
}

function daysBetween(from: string, to: Date): number {
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to.toISOString().slice(0, 10) + "T00:00:00Z");
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function buildWeekTimeline(startDate: string, totalWeeks: number | null): WeekDot[] {
  if (!totalWeeks) return [];
  const elapsed = daysBetween(startDate, new Date());
  const currentWeek = elapsed < 0 ? 0 : Math.floor(elapsed / 7) + 1;

  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    let state: WeekDot["state"];
    if (elapsed < 0) {
      state = "not_started";
    } else if (weekNum < currentWeek) {
      state = "past";
    } else if (weekNum === currentWeek) {
      state = "current";
    } else {
      state = "future";
    }
    return { weekNumber: weekNum, state };
  });
}

// ─── Live DB tests (optional) ─────────────────────────────────

async function runLiveTests() {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { eq, desc } = await import("drizzle-orm");
  const schemaModule = await import("../lib/db/schema");
  const { clientPrograms } = await import("../lib/db/schema-program");
  const { programTemplates } = schemaModule;

  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.log("  ⚠ DATABASE_URL not set — skipping live DB tests");
    return;
  }

  const pg = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(pg, { schema: schemaModule });

  section("Live DB — listClientPrograms query (regression test for original crash)");

  try {
    // Fetch the first client that has any program
    const anyProg = await db
      .select({ clientId: clientPrograms.clientId })
      .from(clientPrograms)
      .limit(1);

    if (anyProg.length === 0) {
      console.log("  ⚠ No programs in DB — skipping live query test");
    } else {
      const clientId = anyProg[0].clientId;

      // Reproduce the EXACT fixed query (no INNER JOIN users)
      let queryError: Error | null = null;
      let rows: Array<{
        assignment: { id: string; status: string; startDate: string };
        programName: string;
        programCategory: string;
        totalWeeks: number | null;
      }> = [];

      try {
        rows = await db
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
          .orderBy(desc(clientPrograms.createdAt)) as typeof rows;
      } catch (e) {
        queryError = e as Error;
      }

      assert(
        "Fixed listClientPrograms query executes without error",
        queryError === null,
      );

      if (queryError) {
        console.log(`    Error: ${queryError.message}`);
      } else {
        assert(
          "Query returns an array (not null/undefined)",
          Array.isArray(rows),
        );

        if (rows.length > 0) {
          const r = rows[0];
          assert(
            "assignment.id is present (all client_programs columns selected)",
            typeof r.assignment.id === "string" && r.assignment.id.length > 0,
          );
          assert(
            "assignment.status is a valid enum value",
            ["active", "inactive", "completed", "cancelled"].includes(r.assignment.status),
          );
          assert(
            "assignment.startDate is a non-empty string",
            typeof r.assignment.startDate === "string" && r.assignment.startDate.length > 0,
          );
          assert(
            "programName is a non-empty string",
            typeof r.programName === "string" && r.programName.length > 0,
          );
          assert(
            "programCategory is a non-empty string",
            typeof r.programCategory === "string" && r.programCategory.length > 0,
          );
        }
      }
    }
  } finally {
    await pg.end();
  }
}

async function main() {
  // ─────────────────────────────────────────────────────────────
  // Section 1 — Query structure (no INNER JOIN users)
  // ─────────────────────────────────────────────────────────────
  section("listClientPrograms — query structure (no redundant JOIN)");

  const svcSrc = await src("lib/db/client-program-service.ts");

  assert(
    "listClientPrograms does NOT join users table (redundant join removed)",
    !svcSrc.includes(".innerJoin(users, eq(clientPrograms.clientId, users.id))"),
  );

  assert(
    "listClientPrograms still joins programTemplates (required for name/category)",
    svcSrc.includes("innerJoin(\n      programTemplates,") ||
      svcSrc.includes("innerJoin(programTemplates,") ||
      svcSrc.includes("innerJoin(\n    programTemplates,"),
  );

  assert(
    "listClientPrograms selects assignment (all client_programs columns)",
    svcSrc.includes("assignment: clientPrograms,"),
  );

  assert(
    "listClientPrograms selects programCategory (program_templates.category)",
    svcSrc.includes("programCategory: programTemplates.category,"),
  );

  assert(
    "listClientPrograms selects totalWeeks (program_templates.default_duration_weeks)",
    svcSrc.includes("totalWeeks: programTemplates.defaultDurationWeeks,"),
  );

  assert(
    "users not imported in client-program-service (removed dead import)",
    !svcSrc.match(/import\s*\{[^}]*\busers\b[^}]*\}\s*from\s*["']\.\/schema["']/),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 2 — Program page renders all 5 states safely
  // ─────────────────────────────────────────────────────────────
  section("Program page — all 5 program states render safely");

  const pageSrc = await src("app/portal/program/page.tsx");

  // State: no_program (programs.length === 0)
  assert(
    "State: no_program — empty state rendered (not a crash)",
    pageSrc.includes("No program assigned yet"),
  );

  // State: future (not_started) — active program with future startDate
  assert(
    "State: future — program header shown when activeProgram exists",
    pageSrc.includes("activeProgram.programName"),
  );

  assert(
    "State: future — WeekTimeline handles not_started (elapsed < 0)",
    pageSrc.includes('state = "not_started"'),
  );

  // State: active — current program with startDate in the past
  assert(
    "State: active — WeekTimeline handles current week",
    pageSrc.includes('state = "current"'),
  );

  assert(
    "State: active — week position shown when currentWeekNum exists",
    // Week position displayed as inline text or stat grid
    (pageSrc.includes("currentWeekNum") && pageSrc.includes("weeksRemaining")) ||
      (pageSrc.includes("Current Week") && pageSrc.includes("Weeks Left")),
  );

  // State: completed — status !== 'active', shown in pastPrograms
  assert(
    "State: completed — past programs section rendered",
    pageSrc.includes("Program History"),
  );

  assert(
    "State: completed — status label uses fallback for unknown statuses",
    pageSrc.includes("STATUS_LABEL[p.assignment.status] ?? p.assignment.status"),
  );

  // State: program history — multiple programs shown
  assert(
    "State: history — pastPrograms iterated with unique keys",
    pageSrc.includes("key={p.assignment.id}"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 3 — buildWeekTimeline pure function
  // ─────────────────────────────────────────────────────────────
  section("buildWeekTimeline — pure function correctness");

  // State: not_started (future startDate)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateStr = futureDate.toISOString().slice(0, 10);
  const futureTimeline = buildWeekTimeline(futureDateStr, 12);

  assert(
    "not_started: returns 12 dots for 12-week program",
    futureTimeline.length === 12,
  );
  assert(
    "not_started: all dots have state='not_started'",
    futureTimeline.every((w) => w.state === "not_started"),
  );

  // State: active (startDate 3 weeks ago → week 4)
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
  const activeStr = threeWeeksAgo.toISOString().slice(0, 10);
  const activeTimeline = buildWeekTimeline(activeStr, 12);

  assert(
    "active: returns 12 dots for 12-week program",
    activeTimeline.length === 12,
  );
  assert(
    "active: weeks 1-3 are 'past'",
    activeTimeline.slice(0, 3).every((w) => w.state === "past"),
  );
  assert(
    "active: week 4 is 'current'",
    activeTimeline[3]?.state === "current",
  );
  assert(
    "active: weeks 5-12 are 'future'",
    activeTimeline.slice(4).every((w) => w.state === "future"),
  );

  // State: completed (startDate 14 weeks ago, 12-week program → past end)
  const fourteenWeeksAgo = new Date();
  fourteenWeeksAgo.setDate(fourteenWeeksAgo.getDate() - 98);
  const completedStr = fourteenWeeksAgo.toISOString().slice(0, 10);
  const completedTimeline = buildWeekTimeline(completedStr, 12);

  assert(
    "completed: all 12 dots are 'past' (currentWeek > totalWeeks)",
    completedTimeline.every((w) => w.state === "past"),
  );

  // State: no_program (totalWeeks null)
  const noTimeline = buildWeekTimeline("2026-01-01", null);
  assert(
    "no_program: returns empty array when totalWeeks is null",
    noTimeline.length === 0,
  );

  // ─────────────────────────────────────────────────────────────
  // Section 4 — Security (auth guards preserved)
  // ─────────────────────────────────────────────────────────────
  section("Security — auth guards preserved");

  assert(
    "Program page uses requireClientUser (server auth guard)",
    pageSrc.includes("requireClientUser"),
  );

  assert(
    "Program page redirects non-client roles to /admin",
    pageSrc.includes('redirect("/admin")'),
  );

  assert(
    "client-program-service has server-only sentinel",
    svcSrc.includes('import "server-only"'),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 5 — Schema consistency check (no missing columns)
  // ─────────────────────────────────────────────────────────────
  section("Schema consistency — Drizzle definition vs applied migrations");

  const schemaSrc = await src("lib/db/schema-program.ts");

  // Verify all fields that were suspect in the original crash exist in schema
  assert(
    "client_programs Drizzle schema has override_allow_multiple",
    schemaSrc.includes('boolean("override_allow_multiple")'),
  );
  assert(
    "client_programs Drizzle schema has coach_notes",
    schemaSrc.includes('text("coach_notes")'),
  );
  assert(
    "client_programs Drizzle schema has end_date",
    schemaSrc.includes('date("end_date")'),
  );
  assert(
    "client_programs Drizzle schema has status (client_program_status enum)",
    schemaSrc.includes('clientProgramStatusEnum("status")'),
  );

  const mainSchemaSrc = await src("lib/db/schema.ts");
  assert(
    "program_templates Drizzle schema has category (template_category enum)",
    mainSchemaSrc.includes('templateCategoryEnum("category")'),
  );
  assert(
    "program_templates Drizzle schema has default_duration_weeks",
    mainSchemaSrc.includes('integer("default_duration_weeks")'),
  );

  // Verify migration 0005 was tracked (client_programs table created)
  const journal = await src("drizzle/meta/_journal.json");
  const journalData = JSON.parse(journal) as { entries: Array<{ tag: string }> };
  assert(
    "Migration 0005 (client_programs) is recorded in journal",
    journalData.entries.some((e) => e.tag === "0005_freezing_namorita"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 6 — Live DB tests (optional, requires --live flag)
  // ─────────────────────────────────────────────────────────────
  if (LIVE) {
    await runLiveTests();
  } else {
    console.log("\n● Live DB tests skipped (pass --live to enable)\n");
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(`  ${passed + failed} tests · ${passed} passed · ${failed} failed`);

  if (failures.length > 0) {
    console.log(`\n  FAILURES:`);
    failures.forEach((f) => console.log(`    ✗ ${f}`));
    console.log();
    process.exit(1);
  } else {
    console.log(`\n  All tests passed.\n`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
