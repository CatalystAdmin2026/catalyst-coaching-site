/**
 * Diagnostic script — Emergency QA
 *
 * Connects to the SAME database as Next.js (DATABASE_URL from .env.local)
 * and runs the exact query that listClientPrograms() uses.
 *
 * Run with:  npx tsx --env-file=.env.local scripts/diagnose-program-query.ts
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, desc } from "drizzle-orm";
import { programTemplates } from "../lib/db/schema";
import { clientPrograms } from "../lib/db/schema-program";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FATAL: DATABASE_URL not set. Run with --env-file=.env.local");
  process.exit(1);
}

// Extract host so we can confirm which project we're hitting (no credentials printed)
try {
  const parsed = new URL(url);
  console.log("\n── Database host:", parsed.hostname);
  console.log("── Database name:", parsed.pathname.slice(1));
  console.log("── Port:", parsed.port || "5432");
} catch {
  console.log("── Could not parse DATABASE_URL as URL");
}

const sql = postgres(url, { prepare: false });
const db = drizzle(sql, {});

// ── Step 1: introspect actual columns on client_programs ──────────────────────

async function introspectTable(tableName: string) {
  console.log(`\n── Actual columns in "${tableName}" (from information_schema):`);
  const rows = await sql`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `;
  if (rows.length === 0) {
    console.log(`   ✗ Table "${tableName}" does NOT exist in public schema`);
  } else {
    rows.forEach((r) =>
      console.log(
        `   ${r.column_name.padEnd(30)} ${r.data_type.padEnd(20)} ${r.is_nullable === "YES" ? "nullable" : "NOT NULL"} ${r.udt_name !== r.data_type ? `(${r.udt_name})` : ""}`
      )
    );
  }
  return rows;
}

async function introspectEnum(enumName: string) {
  console.log(`\n── Enum "${enumName}" values (from pg_enum):`);
  const rows = await sql`
    SELECT enumlabel
    FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = ${enumName}
    ORDER BY enumsortorder
  `;
  if (rows.length === 0) {
    console.log(`   ✗ Enum "${enumName}" does NOT exist`);
  } else {
    rows.forEach((r) => console.log(`   - ${r.enumlabel}`));
  }
  return rows;
}

async function introspectPermissions(tableName: string) {
  console.log(`\n── RLS / permissions on "${tableName}":`);
  const rlsRows = await sql`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = ${tableName} AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `;
  if (rlsRows.length > 0) {
    const r = rlsRows[0];
    console.log(
      `   RLS enabled: ${r.relrowsecurity}, Force RLS: ${r.relforcerowsecurity}`
    );
  }
}

// ── Step 2: run the raw SQL that Drizzle would generate ──────────────────────

async function rawQuery() {
  console.log("\n── Raw SQL (Drizzle equivalent for listClientPrograms):");
  const rawSql = `
    SELECT
      cp.id, cp.client_id, cp.enrollment_id, cp.program_template_id,
      cp.start_date, cp.end_date, cp.status, cp.override_allow_multiple,
      cp.coach_notes, cp.created_at, cp.updated_at,
      pt.name AS program_name,
      pt.category AS program_category,
      pt.default_duration_weeks AS total_weeks
    FROM client_programs cp
    INNER JOIN program_templates pt ON cp.program_template_id = pt.id
    WHERE cp.client_id = '00000000-0000-0000-0000-000000000001'
    ORDER BY cp.created_at DESC
    LIMIT 1
  `;
  console.log(rawSql);

  try {
    const result = await sql.unsafe(rawSql);
    console.log("   ✓ Raw SQL executed successfully, rows:", result.length);
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.log("   ✗ Raw SQL FAILED:");
    console.log("   message:", e.message);
    console.log("   code:", e.code);
    console.log("   detail:", e.detail);
    console.log("   hint:", e.hint);
    console.log("   position:", e.position);
    console.log("   file:", e.file);
    console.log("   line:", e.line);
    console.log("   routine:", e.routine);
  }
}

// ── Step 3: run the actual Drizzle query ─────────────────────────────────────

async function drizzleQuery(clientId: string) {
  console.log(`\n── Drizzle query (listClientPrograms) for clientId=${clientId}:`);
  try {
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
        eq(clientPrograms.programTemplateId, programTemplates.id)
      )
      .where(eq(clientPrograms.clientId, clientId))
      .orderBy(desc(clientPrograms.createdAt));

    console.log(`   ✓ Drizzle query succeeded. Rows returned: ${rows.length}`);
    return { ok: true, rows };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.log("   ✗ Drizzle query FAILED:");
    console.log("   message:", e.message);
    console.log("   code:", e.code);
    console.log("   detail:", e.detail);
    console.log("   hint:", e.hint);
    console.log("   cause:", e.cause);
    console.log("   stack:", e.stack);
    // Check if there's a nested cause with more info
    const cause = e.cause as Record<string, unknown> | undefined;
    if (cause) {
      console.log("   cause.message:", cause.message);
      console.log("   cause.code:", cause.code);
    }
    return { ok: false, error: e };
  }
}

// ── Step 4: find a real clientId to test with ────────────────────────────────

async function findTestClientId(): Promise<string | null> {
  console.log("\n── Looking for a real clientId with a program assignment:");
  try {
    const rows = await sql`
      SELECT cp.client_id
      FROM client_programs cp
      LIMIT 1
    `;
    if (rows.length > 0) {
      console.log(`   Found: ${rows[0].client_id}`);
      return rows[0].client_id;
    }
    console.log("   No client_programs rows found — using null test client");
    return null;
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.log("   Could not fetch clientId:", e.message);
    return null;
  }
}

// ── Step 5: check which migrations are in drizzle_migrations table ────────────

async function checkAppliedMigrations() {
  console.log("\n── Applied migrations (drizzle_migrations table):");
  try {
    const rows = await sql`
      SELECT id, hash, created_at
      FROM drizzle_migrations
      ORDER BY created_at ASC
    `;
    rows.forEach((r) =>
      console.log(`   ${r.id.padEnd(6)} ${r.hash}   ${r.created_at}`)
    );
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.log("   Could not read drizzle_migrations:", e.message);
    // Try alternate table name
    try {
      const rows2 = await sql`
        SELECT name, hash
        FROM "__drizzle_migrations"
        ORDER BY id ASC
      `;
      rows2.forEach((r) => console.log(`   ${r.name}   ${r.hash}`));
    } catch {
      console.log("   __drizzle_migrations also not found");
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    // Introspect schema
    await introspectTable("client_programs");
    await introspectTable("program_templates");
    await introspectEnum("client_program_status");
    await introspectEnum("template_category");
    await introspectPermissions("client_programs");

    // Check migrations
    await checkAppliedMigrations();

    // Run raw SQL (with fake UUID — we only care if the query parses correctly)
    await rawQuery();

    // Find a real client to test with
    const testClientId = await findTestClientId();

    // Run the actual Drizzle query
    await drizzleQuery(testClientId ?? "00000000-0000-0000-0000-000000000001");

  } catch (topErr: unknown) {
    const e = topErr as Record<string, unknown>;
    console.error("\nTOP-LEVEL ERROR:", e.message, e.stack);
  } finally {
    await sql.end();
    console.log("\n── Diagnostic complete.");
  }
}

main();
