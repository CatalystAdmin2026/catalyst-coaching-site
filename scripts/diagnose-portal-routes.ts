/**
 * Full portal route diagnostic.
 *
 * Tests every service function called by:
 *   /portal/program      → listClientPrograms
 *   /portal/check-ins    → getCurrentCheckInWindow, listClientCheckIns
 *   /portal/documents    → getClientProfile (only)
 *   /portal (dashboard)  → getDashboardData
 *   /api/portal/today-workout → getTodayWorkout
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/diagnose-portal-routes.ts
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, gte, lte, desc, isNotNull } from "drizzle-orm";
import { programTemplates, workoutTemplates, clientProfiles } from "../lib/db/schema";
import { clientPrograms, programWeeks, programWeekDays, workoutSessions } from "../lib/db/schema-program";
import { weeklyCheckIns } from "../lib/db/schema-check-in";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

try {
  const u = new URL(url);
  console.log(`\n── DB host: ${u.hostname}  db: ${u.pathname.slice(1)}`);
} catch { /**/ }

const sql = postgres(url, { prepare: false });
const db = drizzle(sql, {});

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n  ${name}... `);
  try {
    const result = await fn();
    console.log("✓", typeof result === "object" ? JSON.stringify(result)?.slice(0, 120) : result);
    pass++;
  } catch (err: unknown) {
    fail++;
    const e = err as Record<string, unknown>;
    console.log("✗ FAILED");
    console.log("    message:", e.message);
    console.log("    code:   ", e.code);
    console.log("    detail: ", e.detail);
    console.log("    hint:   ", e.hint);
    const cause = e.cause as Record<string, unknown> | undefined;
    if (cause) {
      console.log("    cause.message:", cause.message);
      console.log("    cause.code:   ", cause.code);
    }
    // Print relevant stack frames
    const stack = String(e.stack ?? "").split("\n").slice(0, 8).join("\n");
    console.log("    stack:\n" + stack.split("\n").map(l => "      " + l).join("\n"));
  }
}

// ── Get real client IDs ────────────────────────────────────────

async function getRealClientIds(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT client_id FROM client_programs LIMIT 5
  `;
  return rows.map(r => r.client_id as string);
}

async function getCheckInClientId(): Promise<string | null> {
  const rows = await sql`
    SELECT DISTINCT client_id FROM weekly_check_ins LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].client_id as string) : null;
}

// ── weekly_check_ins schema audit ─────────────────────────────

async function auditCheckInSchema() {
  console.log("\n\n── weekly_check_ins schema audit:");
  const cols = await sql`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'weekly_check_ins'
    ORDER BY ordinal_position
  `;
  if (cols.length === 0) {
    console.log("   ✗ Table weekly_check_ins does NOT exist!");
  } else {
    cols.forEach(r => {
      const type = r.udt_name !== r.data_type ? `${r.data_type} (${r.udt_name})` : r.data_type;
      console.log(`   ${String(r.column_name).padEnd(30)} ${String(type).padEnd(35)} ${r.is_nullable === "YES" ? "nullable" : "NOT NULL"}`);
    });
  }

  // Check enums used by check_ins
  const checkInStatus = await sql`
    SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'weekly_check_in_status' ORDER BY enumsortorder
  `;
  if (checkInStatus.length === 0) {
    console.log("   ✗ Enum weekly_check_in_status does NOT exist!");
  } else {
    console.log("   Enum weekly_check_in_status:", checkInStatus.map(r => r.enumlabel).join(", "));
  }
}

// ── Drizzle schema for weekly_check_ins ──────────────────────

async function auditDrizzleCheckInSchema() {
  console.log("\n── Drizzle weeklyCheckIns columns:");
  const cols = Object.entries(weeklyCheckIns).filter(([, v]) => v && typeof v === "object" && "name" in v);
  // Drizzle table columns
  const colObj = weeklyCheckIns as unknown as Record<string, { columnType?: string; name?: string; notNull?: boolean }>;
  const keys = Object.keys(colObj).filter(k => typeof colObj[k] === "object" && "name" in colObj[k]);
  keys.forEach(k => {
    const col = colObj[k];
    console.log(`   ${k.padEnd(25)} → db column: ${col.name ?? k}`);
  });
  return cols;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const clientIds = await getRealClientIds();
  const checkInClientId = await getCheckInClientId();

  console.log(`\n── Found ${clientIds.length} client(s) with program assignments: ${clientIds.join(", ")}`);
  console.log(`── Check-in client: ${checkInClientId ?? "none"}`);

  const testClientId = clientIds[0] ?? "00000000-0000-0000-0000-000000000001";

  // ── BLOCK 1: Program service ─────────────────────────────────
  console.log("\n\n── Block 1: Program service (listClientPrograms, getTodayWorkout)");

  await test("listClientPrograms query", async () => {
    const rows = await db
      .select({
        assignment: clientPrograms,
        programName: programTemplates.name,
        programCategory: programTemplates.category,
        totalWeeks: programTemplates.defaultDurationWeeks,
      })
      .from(clientPrograms)
      .innerJoin(programTemplates, eq(clientPrograms.programTemplateId, programTemplates.id))
      .where(eq(clientPrograms.clientId, testClientId))
      .orderBy(desc(clientPrograms.createdAt));
    return `${rows.length} rows, statuses: ${rows.map(r => r.assignment.status).join(",")}`;
  });

  await test("getTodayWorkout — getClientActiveProgram", async () => {
    const rows = await db
      .select()
      .from(clientPrograms)
      .where(and(
        eq(clientPrograms.clientId, testClientId),
        eq(clientPrograms.status, "active"),
      ))
      .orderBy(desc(clientPrograms.createdAt))
      .limit(1);
    return `found: ${rows.length > 0}, startDate: ${rows[0]?.startDate ?? "—"}`;
  });

  // ── BLOCK 2: Check-in service ────────────────────────────────
  console.log("\n\n── Block 2: Check-in service (getCurrentCheckInWindow, listClientCheckIns)");

  const ciClientId = checkInClientId ?? testClientId;

  await test("weekly_check_ins table readable", async () => {
    const rows = await db
      .select({ id: weeklyCheckIns.id })
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.clientId, ciClientId))
      .limit(5);
    return `${rows.length} rows`;
  });

  await test("weeklyCheckIns explicit projection (production pattern — no lastEditedAt)", async () => {
    // This mirrors what getClientCheckInDetail now does after the fix.
    // Should succeed even without migration 0007 applied.
    const rows = await db
      .select({
        id: weeklyCheckIns.id,
        status: weeklyCheckIns.status,
        submittedAt: weeklyCheckIns.submittedAt,
        weekStartDate: weeklyCheckIns.weekStartDate,
        bodyWeightLbs: weeklyCheckIns.bodyWeightLbs,
        updatedAt: weeklyCheckIns.updatedAt,
      })
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.clientId, ciClientId))
      .limit(1);
    if (rows.length > 0) {
      const r = rows[0];
      return `status=${r.status}, submittedAt=${r.submittedAt}`;
    }
    return "0 rows";
  });

  await test("weeklyCheckIns full SELECT (intentional — demonstrates missing column)", async () => {
    // Expected to FAIL until migration 0007 is applied. Confirms the root cause.
    const rows = await db
      .select()
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.clientId, ciClientId))
      .limit(1);
    return `full select succeeded — migration 0007 is applied! rows=${rows.length}`;
  });

  // ── BLOCK 3: clientProfiles ──────────────────────────────────
  console.log("\n\n── Block 3: getClientProfile");

  await test("clientProfiles for test client", async () => {
    const rows = await db
      .select()
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, testClientId))
      .limit(1);
    return `found: ${rows.length > 0}, preferredName: ${rows[0]?.preferredName ?? "null"}`;
  });

  // ── BLOCK 4: portal-dashboard-service functions ──────────────
  console.log("\n\n── Block 4: dashboard service queries");

  await test("workoutSessions COUNT", async () => {
    const rows = await db
      .select({ id: workoutSessions.id, status: workoutSessions.status })
      .from(workoutSessions)
      .where(eq(workoutSessions.clientId, testClientId))
      .orderBy(desc(workoutSessions.createdAt))
      .limit(10);
    return `${rows.length} sessions`;
  });

  await test("weeklyCheckIns for dashboard (sleep/stress/energy)", async () => {
    const rows = await db
      .select({
        id: weeklyCheckIns.id,
        averageSleepHours: weeklyCheckIns.averageSleepHours,
        averageStress: weeklyCheckIns.averageStress,
        averageEnergy: weeklyCheckIns.averageEnergy,
        submittedAt: weeklyCheckIns.submittedAt,
      })
      .from(weeklyCheckIns)
      .where(and(
        eq(weeklyCheckIns.clientId, ciClientId),
        isNotNull(weeklyCheckIns.submittedAt),
      ))
      .orderBy(desc(weeklyCheckIns.submittedAt))
      .limit(12);
    return `${rows.length} submitted check-ins`;
  });

  // ── BLOCK 5: schema-check-in column mismatch check ──────────
  console.log("\n\n── Block 5: last_edited_at column existence check");

  await test("last_edited_at column exists in DB", async () => {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'weekly_check_ins'
        AND column_name = 'last_edited_at'
    `;
    return cols.length > 0 ? "EXISTS" : "MISSING — migration 0007 not applied!";
  });

  // ── BLOCK 6: Drizzle full-row select with lastEditedAt ──────
  console.log("\n\n── Block 6: Drizzle select including lastEditedAt field");

  await test("weeklyCheckIns.lastEditedAt column readable", async () => {
    const rows = await db
      .select({
        id: weeklyCheckIns.id,
        lastEditedAt: weeklyCheckIns.lastEditedAt,
        status: weeklyCheckIns.status,
      })
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.clientId, ciClientId))
      .limit(1);
    if (rows.length > 0) {
      return `status=${rows[0].status}, lastEditedAt=${rows[0].lastEditedAt ?? "null"}`;
    }
    return "0 rows (no check-ins for this client)";
  });

  // ── Schema introspection ─────────────────────────────────────
  await auditCheckInSchema();
  await auditDrizzleCheckInSchema();

  console.log(`\n\n─────────────────────────────────────────────────────────
  ${pass + fail} tests · ${pass} passed · ${fail} failed
  Database: ${new URL(url!).hostname}
`);

  // Block 2 "full SELECT" and Block 6 "lastEditedAt readable" are intentional
  // probes — they confirm the missing column and are expected to fail until
  // migration 0007 is applied.
  const intentionalFails = 2;
  const unexpectedFails = fail - intentionalFails;

  if (unexpectedFails > 0) {
    console.log("  ✗ UNEXPECTED FAILURES — review errors above");
  } else if (fail > 0) {
    console.log("  ✓ Production code paths all succeed.");
    console.log(`  ✗ ${fail} intentional probe(s) confirm missing column (expected).`);
    console.log("\n  Root cause: migration 0007 not applied.");
    console.log("  Apply in Supabase SQL Editor:");
    console.log('    ALTER TABLE "weekly_check_ins"');
    console.log('      ADD COLUMN "last_edited_at" timestamp with time zone;');
  } else {
    console.log("  ✓ All queries succeed — migration 0007 has been applied.");
  }
}

main().catch(e => {
  console.error("TOP-LEVEL CRASH:", e.message, e.stack);
}).finally(async () => {
  await sql.end();
  console.log("── Diagnostic complete.\n");
});
