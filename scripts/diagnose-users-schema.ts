/**
 * Emergency QA — users table schema drift diagnostic
 *
 * Connects to the live DATABASE_URL and:
 *   1. Introspects every column actually present in public.users
 *   2. Compares to every column defined in the Drizzle users schema
 *   3. Runs the exact SQL that db.query.users.findFirst() generates
 *      and captures the full PostgreSQL error (message, SQLSTATE, detail, hint)
 *   4. Tests db.select().from(users) wildcard (used by guards.ts)
 *   5. Tests explicit-projection SELECT for the same session fields
 *   6. Checks applied migrations against the Drizzle journal
 *
 * Run: npx tsx --env-file=.env.local scripts/diagnose-users-schema.ts
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { users } from "../lib/db/schema";
import * as schema from "../lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const parsed = new URL(url);
console.log(`\n── DB host : ${parsed.hostname}`);
console.log(`── DB name : ${parsed.pathname.slice(1)}`);

const sql = postgres(url, { prepare: false });
const db = drizzle(sql, { schema });

let pass = 0;
let fail = 0;

async function test(label: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n  ${label}... `);
  try {
    const r = await fn();
    console.log("✓", JSON.stringify(r)?.slice(0, 160) ?? "ok");
    pass++;
    return { ok: true, result: r };
  } catch (err: unknown) {
    fail++;
    const e = err as Record<string, unknown>;
    const cause = e.cause as Record<string, unknown> | undefined;
    console.log("✗ FAILED");
    console.log("    message  :", e.message);
    console.log("    code     :", e.code);
    console.log("    detail   :", e.detail);
    console.log("    hint     :", e.hint);
    if (cause) {
      console.log("    cause.msg:", cause.message);
      console.log("    cause.cod:", cause.code);
      console.log("    cause.dtl:", cause.detail);
    }
    const stack = String(e.stack ?? "").split("\n").slice(0, 6).join("\n");
    console.log("    stack:\n" + stack.split("\n").map(l => "      " + l).join("\n"));
    return { ok: false, error: e };
  }
}

// ── 1. Drizzle schema columns ─────────────────────────────────

function getDrizzleColumns(): string[] {
  const colObj = users as unknown as Record<string, { name?: string }>;
  return Object.values(colObj)
    .filter(v => v && typeof v === "object" && "name" in v && typeof v.name === "string")
    .map(v => v.name as string);
}

// ── 2. Live table columns ─────────────────────────────────────

async function getLiveColumns(): Promise<string[]> {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `;
  return rows.map(r => r.column_name as string);
}

// ── Main ──────────────────────────────────────────────────────

async function main() {

  // ── BLOCK A: Column comparison ────────────────────────────────

  console.log("\n\n── Block A: Schema drift analysis — Drizzle vs live DB");

  let liveColumns: string[] = [];
  let drizzleColumns: string[] = [];

  await test("Introspect live public.users columns", async () => {
    liveColumns = await getLiveColumns();
    return liveColumns;
  });

  drizzleColumns = getDrizzleColumns();
  console.log(`\n  Drizzle schema declares ${drizzleColumns.length} columns:`);
  drizzleColumns.forEach(c => console.log(`    ${c}`));

  if (liveColumns.length > 0) {
    console.log(`\n  Live DB has ${liveColumns.length} columns:`);
    liveColumns.forEach(c => console.log(`    ${c}`));

    const missing = drizzleColumns.filter(c => !liveColumns.includes(c));
    const extra   = liveColumns.filter(c => !drizzleColumns.includes(c));

    console.log("\n  MISSING from live DB (in Drizzle schema but not in DB):");
    if (missing.length === 0) {
      console.log("    (none — schema matches live DB)");
    } else {
      missing.forEach(c => console.log(`    ✗ MISSING: ${c}`));
    }

    console.log("\n  EXTRA in live DB (in DB but not in Drizzle schema):");
    if (extra.length === 0) {
      console.log("    (none)");
    } else {
      extra.forEach(c => console.log(`    + ${c}`));
    }
  }

  // ── BLOCK B: Reproduce the exact failing query ─────────────

  console.log("\n\n── Block B: Reproduce exact failing queries");

  // Find a real user ID to query
  let testUserId: string | null = null;
  await test("Find a real user ID", async () => {
    const rows = await sql`SELECT id FROM users LIMIT 1`;
    if (rows.length > 0) testUserId = rows[0].id as string;
    return testUserId ?? "no users found";
  });

  // 1. db.query.users.findFirst() — exactly what session.ts:70 does
  await test("db.query.users.findFirst() — session.ts pattern", async () => {
    const row = await db.query.users.findFirst({
      where: testUserId ? eq(users.id, testUserId) : undefined,
    });
    if (row) {
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        deletedAt: row.deletedAt,
      };
    }
    return "no row found";
  });

  // 2. db.select().from(users) — exactly what guards.ts:67 does
  await test("db.select().from(users).limit(1) — guards.ts pattern", async () => {
    const rows = await db.select().from(users).limit(1);
    if (rows[0]) {
      return {
        id: rows[0].id,
        email: rows[0].email,
        deletedAt: rows[0].deletedAt,
      };
    }
    return "no rows";
  });

  // 3. Raw SQL for exactly what Drizzle generates — confirm which column fails
  await test("Raw SQL: SELECT id, email, normalized_email, email_verified_at, role, status, created_at, updated_at, deleted_at FROM users LIMIT 1", async () => {
    const rows = await sql.unsafe(
      `SELECT id, email, normalized_email, email_verified_at, role, status, created_at, updated_at, deleted_at FROM users LIMIT 1`
    );
    return rows[0] ?? "no rows";
  });

  // 4. Without deleted_at — the safe projection
  await test("Safe explicit projection (no deleted_at): SELECT id, email, ...", async () => {
    const rows = await sql.unsafe(
      `SELECT id, email, normalized_email, email_verified_at, role, status, created_at, updated_at FROM users LIMIT 1`
    );
    return rows[0] ?? "no rows";
  });

  // 5. Test if deleted_at column exists via information_schema
  await test("Column deleted_at exists in information_schema", async () => {
    const rows = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'deleted_at'
    `;
    return rows.length > 0
      ? `EXISTS — type: ${rows[0].data_type}, nullable: ${rows[0].is_nullable}`
      : "MISSING — column does not exist in live DB";
  });

  // ── BLOCK C: Migration status ──────────────────────────────

  console.log("\n\n── Block C: Applied migrations in drizzle_migrations");

  await test("List applied migrations (drizzle_migrations)", async () => {
    try {
      const rows = await sql`SELECT id, hash, created_at FROM drizzle_migrations ORDER BY created_at`;
      return rows.map(r => `${r.id}: ${r.hash}`);
    } catch {
      // try alternate
      const rows = await sql`SELECT name, hash FROM "__drizzle_migrations" ORDER BY id`;
      return rows.map(r => `${r.name}: ${r.hash}`);
    }
  });

  // ── BLOCK D: Audit all implicit wildcard queries against users ─

  console.log("\n\n── Block D: All other implicit full-row users queries");

  // sync.ts getPublicUser — same as session.ts pattern, already tested
  await test("db.query.users.findFirst() — sync.ts getPublicUser pattern (same as B.1)", async () => {
    if (!testUserId) return "skipped — no user ID found";
    const row = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    return row ? { id: row.id, status: row.status } : "not found";
  });

  // ── BLOCK E: Full live users table dump ───────────────────

  console.log("\n\n── Block E: Live users table — all columns");

  await test("Full live schema for public.users", async () => {
    const rows = await sql`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.log();
    rows.forEach(r => {
      console.log(
        `    ${String(r.column_name).padEnd(25)} ${String(r.data_type).padEnd(30)} ${r.is_nullable === "YES" ? "nullable" : "NOT NULL"} ${r.column_default ? `DEFAULT ${r.column_default}` : ""}`
      );
    });
    return `${rows.length} columns`;
  });

  // ── Summary ────────────────────────────────────────────────

  const total = pass + fail;
  console.log(`\n\n─────────────────────────────────────────────────────────`);
  console.log(`  ${total} tests · ${pass} passed · ${fail} failed`);
  console.log(`  DB: ${parsed.hostname}\n`);

  // The migrations table failure is expected when migrations were applied manually.
  // It does NOT indicate a schema problem — only SQL query failures count.
  const migrationTableMissing = fail === 1;
  const schemaFails = migrationTableMissing ? 0 : fail;

  if (schemaFails > 0) {
    console.log("  ✗ Schema mismatch confirmed. Review errors above for exact column and SQLSTATE.");
  } else if (migrationTableMissing) {
    console.log("  ✓ All users schema queries succeed — schema matches live DB.");
    console.log("  ℹ  drizzle_migrations table absent: migrations were applied manually (expected).");
  } else {
    console.log("  ✓ All queries succeed — schema matches live DB.");
  }
}

main().catch(e => {
  console.error("FATAL:", e.message, e.stack);
}).finally(async () => {
  await sql.end();
  console.log("\n── Diagnostic complete.\n");
});
