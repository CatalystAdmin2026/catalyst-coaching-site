/**
 * Regression tests — check-in lastEditedAt end-to-end
 *
 * Verifies that Sprint 6.4's lastEditedAt field is correctly wired
 * through all layers after migration 0007 was applied.
 *
 * Two modes:
 *   --pre-migration  Assert safe fallback state (column references removed)
 *   (default)        Assert full restored state (column live, wired through)
 *
 * Run with: npx tsx scripts/acceptance-test-check-in-schema-regression.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const PRE_MIGRATION = process.argv.includes("--pre-migration");

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

function extractFn(src: string, fnName: string): string {
  const marker = `export async function ${fnName}`;
  const start = src.indexOf(marker);
  if (start < 0) return "";
  const next = src.indexOf("\nexport async function ", start + marker.length);
  return next > 0 ? src.slice(start, next) : src.slice(start);
}

function extractSelectBlock(fnBody: string): string {
  const selectStart = fnBody.indexOf(".select({");
  if (selectStart < 0) return "";
  const fromStart = fnBody.indexOf(".from(", selectStart);
  return fromStart > 0 ? fnBody.slice(selectStart, fromStart) : "";
}

function extractSetBlock(fnBody: string): string {
  const setStart = fnBody.indexOf(".set({");
  if (setStart < 0) return "";
  let depth = 0;
  let i = setStart;
  while (i < fnBody.length) {
    if (fnBody[i] === "{") depth++;
    if (fnBody[i] === "}") { depth--; if (depth === 0) break; }
    i++;
  }
  return fnBody.slice(setStart, i + 1);
}

const checkInSvc = readSrc("lib/db/check-in-service.ts");
const coachSvc = readSrc("lib/db/coach-check-in-service.ts");

if (PRE_MIGRATION) {
  console.log("\n── Mode: PRE-MIGRATION (column not yet in DB — safe fallback checks)");
} else {
  console.log("\n── Mode: POST-MIGRATION (column live — full functionality checks)");
}
console.log("   Sprint 6.4 QA: lastEditedAt tracks client post-submission edits\n");

// ── getClientCheckInDetail ────────────────────────────────────

console.log("● getClientCheckInDetail");

const detailFn = extractFn(checkInSvc, "getClientCheckInDetail");
const detailSelect = extractSelectBlock(detailFn);

assert(
  "uses explicit .select({ ... }) — no wildcard .select()",
  !detailFn.includes(".select()") && detailFn.includes(".select({"),
  ".select() wildcard found — unsafe if schema and DB are ever out of sync",
);

if (PRE_MIGRATION) {
  assert(
    "SELECT excludes weeklyCheckIns.lastEditedAt (column not yet in DB)",
    !detailSelect.includes("weeklyCheckIns.lastEditedAt"),
  );
  assert(
    "returns lastEditedAt: null as safe fallback",
    detailFn.includes("lastEditedAt: null"),
  );
} else {
  assert(
    "SELECT includes weeklyCheckIns.lastEditedAt (migration applied)",
    detailSelect.includes("weeklyCheckIns.lastEditedAt"),
    "weeklyCheckIns.lastEditedAt missing from SELECT — lastEditedAt will always be null",
  );
  assert(
    "returns lastEditedAt: row.lastEditedAt (live value from DB)",
    detailFn.includes("lastEditedAt: row.lastEditedAt"),
    "lastEditedAt: row.lastEditedAt missing — edit timestamps won't display",
  );
}

// ── getPreviousCheckIn ────────────────────────────────────────

console.log("\n● getPreviousCheckIn");

const prevFn = extractFn(checkInSvc, "getPreviousCheckIn");
const prevSelect = extractSelectBlock(prevFn);

assert(
  "uses explicit .select({ ... }) — no wildcard .select()",
  !prevFn.includes(".select()") && prevFn.includes(".select({"),
);

if (PRE_MIGRATION) {
  assert(
    "SELECT excludes weeklyCheckIns.lastEditedAt",
    !prevSelect.includes("weeklyCheckIns.lastEditedAt"),
  );
  assert(
    "returns lastEditedAt: null",
    prevFn.includes("lastEditedAt: null"),
  );
} else {
  assert(
    "SELECT includes weeklyCheckIns.lastEditedAt",
    prevSelect.includes("weeklyCheckIns.lastEditedAt"),
  );
  assert(
    "returns lastEditedAt: row.lastEditedAt",
    prevFn.includes("lastEditedAt: row.lastEditedAt"),
  );
}

// ── editSubmittedCheckIn ──────────────────────────────────────

console.log("\n● editSubmittedCheckIn — UPDATE SET clause");

const editFn = extractFn(checkInSvc, "editSubmittedCheckIn");
const setBlock = extractSetBlock(editFn);

if (PRE_MIGRATION) {
  assert(
    "SET clause excludes lastEditedAt (column not yet in DB)",
    !setBlock.match(/^\s*lastEditedAt\s*:/m),
  );
} else {
  assert(
    "SET clause assigns lastEditedAt: now (records edit timestamp)",
    !!setBlock.match(/lastEditedAt\s*:\s*now/),
    "lastEditedAt: now missing from UPDATE — edit timestamps won't be recorded",
  );
}

assert(
  "SET clause includes updatedAt: now (data integrity)",
  setBlock.includes("updatedAt:"),
);

assert(
  "submittedAt NOT included in SET clause (original timestamp preserved)",
  !setBlock.includes("submittedAt:"),
);

// ── getCoachCheckInDetail ─────────────────────────────────────

console.log("\n● getCoachCheckInDetail (coach-check-in-service.ts)");

const coachDetailFn = extractFn(coachSvc, "getCoachCheckInDetail");
const coachSelect = extractSelectBlock(coachDetailFn);

if (PRE_MIGRATION) {
  assert(
    "SELECT excludes weeklyCheckIns.lastEditedAt",
    !coachSelect.includes("weeklyCheckIns.lastEditedAt"),
  );
  assert(
    "returns lastEditedAt: null",
    coachDetailFn.includes("lastEditedAt: null"),
  );
} else {
  assert(
    "SELECT includes weeklyCheckIns.lastEditedAt",
    coachSelect.includes("weeklyCheckIns.lastEditedAt"),
    "HQ check-in detail won't show 'Edited after submission' indicator",
  );
  assert(
    "returns lastEditedAt: row.lastEditedAt",
    coachDetailFn.includes("lastEditedAt: row.lastEditedAt"),
  );
}

// ── Safe functions always use explicit projection ─────────────

console.log("\n● Safe functions — explicit projection (invariant regardless of migration state)");

assert(
  "listClientCheckIns uses explicit .select({ ... })",
  !extractFn(checkInSvc, "listClientCheckIns").includes(".select()"),
);

assert(
  "getCurrentCheckInWindow uses explicit .select({ ... })",
  !extractFn(checkInSvc, "getCurrentCheckInWindow").includes(".select()"),
);

// ── Migration file ────────────────────────────────────────────

console.log("\n● Migration 0007");

const mig0007Path = path.join(ROOT, "drizzle/0007_add_last_edited_at.sql");
assert(
  "Migration file exists at drizzle/0007_add_last_edited_at.sql",
  fs.existsSync(mig0007Path),
);

if (fs.existsSync(mig0007Path)) {
  const mig = readSrc("drizzle/0007_add_last_edited_at.sql");
  const addColLine = mig.split("\n").find(l => l.trim().startsWith("ADD COLUMN")) ?? "";
  assert(
    "ADD COLUMN statement targets last_edited_at",
    addColLine.includes("last_edited_at"),
  );
  assert(
    "Column is nullable timestamptz (no NOT NULL on ADD COLUMN line)",
    !addColLine.includes("NOT NULL") && addColLine.toLowerCase().includes("timestamp"),
  );
}

// ── Schema ────────────────────────────────────────────────────

console.log("\n● Drizzle schema");

const schemaSrc = readSrc("lib/db/schema-check-in.ts");
assert(
  "schema-check-in.ts defines lastEditedAt column",
  schemaSrc.includes("lastEditedAt") && schemaSrc.includes("last_edited_at"),
);

const checkInDetailInterface = checkInSvc.slice(
  checkInSvc.indexOf("interface CheckInDetail"),
  checkInSvc.indexOf("}", checkInSvc.indexOf("interface CheckInDetail")) + 1,
);
assert(
  "CheckInDetail interface includes lastEditedAt: Date | null",
  checkInDetailInterface.includes("lastEditedAt") && checkInDetailInterface.includes("Date | null"),
);

// ── Summary ───────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────────────────`);
console.log(`  ${total} tests · ${pass} passed · ${fail} failed\n`);

if (fail === 0) {
  if (PRE_MIGRATION) {
    console.log("  ✓ Service layer is safe against missing last_edited_at column.");
  } else {
    console.log("  ✓ Sprint 6.4 lastEditedAt fully restored.");
    console.log("  ✓ Edit timestamps will be recorded and displayed correctly.");
  }
} else {
  console.log("  ✗ Failures detected — review above.");
  if (!PRE_MIGRATION) {
    console.log("  Hint: If migration 0007 is not yet applied, run with --pre-migration");
  }
}

console.log();
