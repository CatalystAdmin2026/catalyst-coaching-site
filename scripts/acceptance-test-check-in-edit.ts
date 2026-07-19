// ─────────────────────────────────────────────────────────────
// Sprint 6.4 QA Enhancement — Editable Submitted Check-In Tests
//
// 11 deterministic tests covering the full edit workflow:
//   1–3.  Service layer — editSubmittedCheckIn signature and guards
//   4.    Action layer — editSubmittedCheckInAction exists and guards
//   5–6.  Edit page — server-side status guard + form pre-population
//   7.    Detail page — edit button only for submitted status
//   8.    Detail page — lastEditedAt timestamp display
//   9.    Detail page — success banner on ?edited=1
//   10.   Check-ins list — "complete" state + next open date + edit link
//   11.   HQ coach page — "Edited after submission" indicator
//
// Run: npx tsx scripts/acceptance-test-check-in-edit.ts
// ─────────────────────────────────────────────────────────────

import { readFile } from "fs/promises";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

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

async function main() {
  // ─────────────────────────────────────────────────────────────
  // Tests 1–3: Service layer — editSubmittedCheckIn
  // ─────────────────────────────────────────────────────────────
  section("Tests 1–3 · Service layer — editSubmittedCheckIn");

  const svcSrc = await src("lib/db/check-in-service.ts");

  // Test 1: function is exported
  assert(
    "1. editSubmittedCheckIn is exported from check-in-service",
    svcSrc.includes("export async function editSubmittedCheckIn("),
  );

  // Test 2: atomic conditional WHERE (clientId + status = submitted)
  assert(
    "2. Atomic conditional update guards on status = 'submitted' (race-condition proof)",
    svcSrc.includes("eq(weeklyCheckIns.status, \"submitted\")") &&
    svcSrc.includes("eq(weeklyCheckIns.clientId, clientId)") &&
    svcSrc.includes(".returning({ id: weeklyCheckIns.id })"),
  );

  // Test 3: race-condition error message matches spec
  assert(
    "3. Returns race-condition error when coach has started reviewing",
    svcSrc.includes("Your coach has already started reviewing this check-in"),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 4: Action layer — editSubmittedCheckInAction
  // ─────────────────────────────────────────────────────────────
  section("Test 4 · Action layer — editSubmittedCheckInAction");

  const actionsSrc = await src("app/portal/check-ins/actions.ts");

  assert(
    "4. editSubmittedCheckInAction is exported from actions, requires auth, role guard",
    actionsSrc.includes("export async function editSubmittedCheckInAction(") &&
    actionsSrc.includes('dbUser.role !== "client"') &&
    actionsSrc.includes("requireClientUser"),
  );

  // ─────────────────────────────────────────────────────────────
  // Tests 5–6: Edit page
  // ─────────────────────────────────────────────────────────────
  section("Tests 5–6 · Edit page — server-side guard + pre-population");

  const editPageSrc = await src(
    "app/portal/check-ins/[checkInId]/edit/page.tsx",
  );

  // Test 5: server-side status guard redirects non-submitted check-ins
  assert(
    "5. Edit page redirects when status !== 'submitted' (server-side guard)",
    editPageSrc.includes('checkIn.status !== "submitted"') &&
    editPageSrc.includes(`redirect(\`/portal/check-ins/\${checkInId}\``),
  );

  // Test 6: pre-populates form with existing data, not blank defaults
  assert(
    "6. Edit page passes pre-populated initialData to EditCheckInForm",
    editPageSrc.includes("bodyWeightLbs: checkIn.bodyWeightLbs ?? \"\"") &&
    editPageSrc.includes("waistInches: checkIn.waistInches ?? \"\"") &&
    editPageSrc.includes("averageStress: checkIn.averageStress") &&
    editPageSrc.includes("wins: checkIn.wins ?? \"\""),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 7: Detail page — edit button conditionally shown
  // ─────────────────────────────────────────────────────────────
  section("Test 7 · Portal detail page — edit button only for submitted status");

  const detailSrc = await src("app/portal/check-ins/[checkInId]/page.tsx");

  assert(
    "7. Edit button shown only when checkIn.status === 'submitted'",
    detailSrc.includes('checkIn.status === "submitted"') &&
    detailSrc.includes('/edit`') &&
    // Must NOT show edit button unconditionally (button is inside a conditional)
    !detailSrc.match(/href=.*\/edit`[^{]*\{[^}]*checkIn\.status/),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 8: Detail page — lastEditedAt timestamp display
  // ─────────────────────────────────────────────────────────────
  section("Test 8 · Portal detail page — lastEditedAt display");

  assert(
    "8. Detail page displays lastEditedAt when present (Last edited timestamp)",
    detailSrc.includes("checkIn.lastEditedAt") &&
    detailSrc.includes("Last edited") &&
    detailSrc.includes("fmtTimestamp(checkIn.lastEditedAt)"),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 9: Detail page — success banner on ?edited=1
  // ─────────────────────────────────────────────────────────────
  section("Test 9 · Portal detail page — success confirmation after edit");

  assert(
    "9. Detail page shows 'Changes saved' banner when searchParams.edited === '1'",
    detailSrc.includes('edited === "1"') &&
    detailSrc.includes("Changes saved"),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 10: Check-ins list — complete state messaging
  // ─────────────────────────────────────────────────────────────
  section("Test 10 · Check-ins list — 'complete' state + next open date + edit link");

  const listSrc = await src("app/portal/check-ins/page.tsx");

  assert(
    "10. Check-ins list shows 'complete' message, next open date, View/Edit buttons for submitted",
    listSrc.includes("This week") &&
    listSrc.includes("check-in is complete") &&
    listSrc.includes("nextCheckInLabel") &&
    listSrc.includes('Next check-in opens') &&
    listSrc.includes('status === "submitted"') &&
    listSrc.includes("/edit`") &&
    // Must NOT show a second Start Check-In option in the submitted/complete branch
    !listSrc.includes("check-in is complete") === false ||
    !listSrc.match(/check-in is complete[\s\S]{0,500}Start Check-In/),
  );

  // ─────────────────────────────────────────────────────────────
  // Test 11: HQ coach page — "Edited after submission" indicator
  // ─────────────────────────────────────────────────────────────
  section("Test 11 · HQ coach page — 'Edited after submission' indicator");

  const hqSrc = await src("app/hq/check-ins/[checkInId]/page.tsx");

  assert(
    "11. HQ coach page shows 'Edited after submission' when checkIn.lastEditedAt is set",
    hqSrc.includes("checkIn.lastEditedAt") &&
    hqSrc.includes("Edited after submission"),
  );

  // ─────────────────────────────────────────────────────────────
  // Bonus checks: schema + migration
  // ─────────────────────────────────────────────────────────────
  section("Bonus · Schema + migration audit");

  const schemaSrc = await src("lib/db/schema-check-in.ts");
  assert(
    "Drizzle schema has lastEditedAt column definition",
    schemaSrc.includes('timestamp("last_edited_at"'),
  );

  assert(
    "CheckInDetail interface includes lastEditedAt: Date | null",
    svcSrc.includes("lastEditedAt: Date | null"),
  );

  const migSrc = await src("drizzle/0007_add_last_edited_at.sql");
  assert(
    "Migration 0007 adds last_edited_at as nullable column (DO NOT APPLY label present)",
    migSrc.includes("ADD COLUMN") &&
    migSrc.includes("last_edited_at") &&
    migSrc.includes("timestamp with time zone") &&
    migSrc.includes("DO NOT APPLY"),
  );

  // submittedAt must NOT be touched by editSubmittedCheckIn
  assert(
    "editSubmittedCheckIn does NOT update submittedAt (preserves original submission)",
    !svcSrc.match(/editSubmittedCheckIn[\s\S]*?submittedAt\s*:/),
  );

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
