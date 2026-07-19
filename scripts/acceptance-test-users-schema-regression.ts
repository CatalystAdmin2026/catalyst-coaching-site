/**
 * Regression tests — users schema drift protection
 *
 * Verifies that every function that queries public.users uses an explicit
 * column projection instead of db.query / db.select() wildcards.
 *
 * Background: Drizzle's db.query.table.findFirst() and db.select().from(table)
 * (no projection args) expand to ALL columns defined in the Drizzle schema.
 * If the live DB doesn't have a schema column yet (schema ahead of migration),
 * every auth request fails with SQLSTATE 42703 "column does not exist."
 *
 * Explicit projection (db.select({ col: table.col, ... })) is immune:
 * it only requests the declared columns and fails fast at code review time
 * if a column is removed from the schema.
 *
 * Run: npx tsx scripts/acceptance-test-users-schema-regression.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");

let pass = 0;
let fail = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.log(`  ✗ ${name}`);
    if (detail) console.log(`    Detail: ${detail}`);
    fail++;
  }
}

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

// ── session.ts ────────────────────────────────────────────────

console.log("\n● lib/supabase/session.ts");

const sessionSrc = readSrc("lib/supabase/session.ts");

assert(
  "requireClientUser uses explicit db.select({ ... }) — no db.query.users",
  !sessionSrc.includes("db.query.users.findFirst") &&
    sessionSrc.includes("db\n    .select(USER_COLS)") ||
    sessionSrc.includes(".select(USER_COLS)"),
  "db.query.users.findFirst() found — wildcards every schema column, vulnerable to 42703",
);

assert(
  "USER_COLS projection defined and includes all PublicUser fields",
  sessionSrc.includes("const USER_COLS") &&
    sessionSrc.includes("id: users.id") &&
    sessionSrc.includes("email: users.email") &&
    sessionSrc.includes("normalizedEmail: users.normalizedEmail") &&
    sessionSrc.includes("emailVerifiedAt: users.emailVerifiedAt") &&
    sessionSrc.includes("role: users.role") &&
    sessionSrc.includes("status: users.status") &&
    sessionSrc.includes("createdAt: users.createdAt") &&
    sessionSrc.includes("updatedAt: users.updatedAt") &&
    sessionSrc.includes("deletedAt: users.deletedAt"),
  "USER_COLS missing one or more PublicUser fields",
);

assert(
  "requireClientUser does not use wildcard db.select().from(users)",
  !sessionSrc.includes(".select()\n    .from(users)") &&
    !sessionSrc.includes(".select().from(users)"),
);

assert(
  "getClientProfile uses explicit db.select({ ... }) — no db.query.clientProfiles",
  !sessionSrc.includes("db.query.clientProfiles.findFirst") &&
    sessionSrc.includes("clientProfiles.userId") &&
    sessionSrc.includes("clientProfiles.fullName"),
  "db.query.clientProfiles.findFirst() found — wildcards every schema column",
);

// ── guards.ts ─────────────────────────────────────────────────

console.log("\n● lib/auth/guards.ts");

const guardsSrc = readSrc("lib/auth/guards.ts");

assert(
  "resolveSession uses explicit db.select({ ... }) — not wildcard .select()",
  !guardsSrc.includes(".select()\n    .from(users)") &&
    !guardsSrc.includes(".select().from(users)") &&
    guardsSrc.includes("id: users.id"),
  "Wildcard db.select().from(users) found in guards.ts — 42703 risk",
);

assert(
  "resolveSession projection includes role and status (used for access control)",
  guardsSrc.includes("role: users.role") &&
    guardsSrc.includes("status: users.status"),
);

assert(
  "resolveSession projection includes all PublicUser fields",
  guardsSrc.includes("id: users.id") &&
    guardsSrc.includes("email: users.email") &&
    guardsSrc.includes("normalizedEmail: users.normalizedEmail") &&
    guardsSrc.includes("emailVerifiedAt: users.emailVerifiedAt") &&
    guardsSrc.includes("createdAt: users.createdAt") &&
    guardsSrc.includes("updatedAt: users.updatedAt") &&
    guardsSrc.includes("deletedAt: users.deletedAt"),
);

// ── sync.ts ───────────────────────────────────────────────────

console.log("\n● lib/auth/sync.ts");

const syncSrc = readSrc("lib/auth/sync.ts");

assert(
  "getPublicUser uses explicit db.select({ ... }) — no db.query.users",
  !syncSrc.includes("db.query.users.findFirst") &&
    syncSrc.includes("USER_COLS"),
  "db.query.users.findFirst() found in sync.ts — wildcards every schema column",
);

assert(
  "USER_COLS projection in sync.ts includes all PublicUser fields",
  syncSrc.includes("const USER_COLS") &&
    syncSrc.includes("id: users.id") &&
    syncSrc.includes("email: users.email") &&
    syncSrc.includes("role: users.role") &&
    syncSrc.includes("status: users.status") &&
    syncSrc.includes("deletedAt: users.deletedAt"),
);

// ── schema.ts — users table columns ──────────────────────────

console.log("\n● lib/db/schema.ts — users table");

const schemaSrc = readSrc("lib/db/schema.ts");

const usersTableBlock = (() => {
  const start = schemaSrc.indexOf('export const users = pgTable');
  if (start < 0) return "";
  const end = schemaSrc.indexOf("\n);", start);
  return end > 0 ? schemaSrc.slice(start, end) : "";
})();

assert(
  "users table defines deletedAt column",
  usersTableBlock.includes("deletedAt") && usersTableBlock.includes("deleted_at"),
  "deletedAt missing from users schema — PublicUser.deletedAt will break",
);

assert(
  "users table defines emailVerifiedAt column",
  usersTableBlock.includes("emailVerifiedAt") && usersTableBlock.includes("email_verified_at"),
);

assert(
  "users table defines normalizedEmail column",
  usersTableBlock.includes("normalizedEmail") && usersTableBlock.includes("normalized_email"),
);

assert(
  "users table defines role and status enums",
  usersTableBlock.includes("userRoleEnum") && usersTableBlock.includes("userStatusEnum"),
);

// ── migration 0000 — initial users table ─────────────────────

console.log("\n● drizzle/0000_fair_excalibur.sql — initial migration");

const mig0000Path = path.join(ROOT, "drizzle/0000_fair_excalibur.sql");
assert(
  "Migration 0000 file exists",
  fs.existsSync(mig0000Path),
);

if (fs.existsSync(mig0000Path)) {
  const mig0000 = readSrc("drizzle/0000_fair_excalibur.sql");
  const usersCreate = (() => {
    const start = mig0000.indexOf('CREATE TABLE "users"');
    if (start < 0) return "";
    const end = mig0000.indexOf(");", start);
    return end > 0 ? mig0000.slice(start, end) : "";
  })();

  assert(
    "Migration 0000 CREATE TABLE users includes deleted_at",
    usersCreate.includes('"deleted_at"'),
    "deleted_at missing from initial CREATE TABLE — must be added via ALTER TABLE migration",
  );

  assert(
    "Migration 0000 CREATE TABLE users includes email_verified_at",
    usersCreate.includes('"email_verified_at"'),
  );

  assert(
    "Migration 0000 CREATE TABLE users includes normalized_email",
    usersCreate.includes('"normalized_email"'),
  );
}

// ── PublicUser interface alignment ───────────────────────────

console.log("\n● PublicUser interface in session.ts");

const publicUserBlock = sessionSrc.slice(
  sessionSrc.indexOf("export interface PublicUser"),
  sessionSrc.indexOf("}", sessionSrc.indexOf("export interface PublicUser")) + 1,
);

assert(
  "PublicUser interface declares deletedAt: Date | null",
  publicUserBlock.includes("deletedAt") && publicUserBlock.includes("Date | null"),
);

assert(
  "PublicUser interface declares all 9 fields",
  publicUserBlock.includes("id") &&
    publicUserBlock.includes("email") &&
    publicUserBlock.includes("normalizedEmail") &&
    publicUserBlock.includes("emailVerifiedAt") &&
    publicUserBlock.includes("role") &&
    publicUserBlock.includes("status") &&
    publicUserBlock.includes("createdAt") &&
    publicUserBlock.includes("updatedAt") &&
    publicUserBlock.includes("deletedAt"),
);

// ── Summary ───────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────────────────`);
console.log(`  ${total} tests · ${pass} passed · ${fail} failed\n`);

if (fail === 0) {
  console.log("  ✓ All auth paths use explicit column projections.");
  console.log("  ✓ users schema drift cannot cause SQLSTATE 42703 in requireClientUser().");
} else {
  console.log("  ✗ Failures — one or more auth queries still use wildcard SELECT.");
  console.log("    A schema column added to Drizzle before the migration is applied");
  console.log("    will crash every portal request with SQLSTATE 42703.");
}

console.log();
