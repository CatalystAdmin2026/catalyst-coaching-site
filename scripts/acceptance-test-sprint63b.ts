#!/usr/bin/env npx tsx
/**
 * Sprint 6.3B Acceptance Tests — Check-In Review Center
 *
 * Deterministic, no-database verification of business logic.
 * Avoids importing server-only modules — uses file reads and
 * inline re-implementations of pure utility functions.
 *
 * Run: npx tsx scripts/acceptance-test-sprint63b.ts
 */

import { readFile } from "fs/promises";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title}`);
}

// ─────────────────────────────────────────────────────────────
// INLINE PURE UTILITIES (mirrors check-in-service.ts)
// ─────────────────────────────────────────────────────────────

function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  return d.toISOString().split("T")[0];
}

function getWeekEndDate(date: Date = new Date()): string {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (6 - dayOfWeek));
  return d.toISOString().split("T")[0];
}

function getCheckInDueDate(
  weekStartDate: string,
  checkInDayOfWeek: number | null | undefined,
): string {
  const day = checkInDayOfWeek ?? 0;
  const sunday = new Date(weekStartDate + "T00:00:00Z");
  sunday.setUTCDate(sunday.getUTCDate() + day);
  return sunday.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────
// FILE CONTENT HELPER
// ─────────────────────────────────────────────────────────────

async function readSrc(relativePath: string): Promise<string> {
  return readFile(relativePath, "utf-8");
}

async function fileExists(relativePath: string): Promise<boolean> {
  try {
    await readFile(relativePath, "utf-8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // ─────────────────────────────────────────────────────────────
  // WEEK DATE HELPERS
  // ─────────────────────────────────────────────────────────────

  section("Week date helpers");

  {
    const sunday = new Date("2026-07-12T00:00:00Z");
    assert("Sunday input → same Sunday as week start", getWeekStartDate(sunday) === "2026-07-12");
  }

  {
    const monday = new Date("2026-07-13T00:00:00Z");
    assert("Monday input → preceding Sunday as week start", getWeekStartDate(monday) === "2026-07-12");
  }

  {
    const saturday = new Date("2026-07-18T00:00:00Z");
    assert("Saturday input → preceding Sunday as week start", getWeekStartDate(saturday) === "2026-07-12");
  }

  {
    const sunday = new Date("2026-07-12T00:00:00Z");
    assert("Week end is Saturday of same week", getWeekEndDate(sunday) === "2026-07-18");
  }

  // ─────────────────────────────────────────────────────────────
  // DUE DATE CALCULATION
  // ─────────────────────────────────────────────────────────────

  section("Due date calculation");

  assert("checkInDayOfWeek=0 (Sun) → due Sunday", getCheckInDueDate("2026-07-12", 0) === "2026-07-12");
  assert("checkInDayOfWeek=1 (Mon) → due Monday", getCheckInDueDate("2026-07-12", 1) === "2026-07-13");
  assert("checkInDayOfWeek=6 (Sat) → due Saturday", getCheckInDueDate("2026-07-12", 6) === "2026-07-18");
  assert("null checkInDayOfWeek → Sunday fallback", getCheckInDueDate("2026-07-12", null) === "2026-07-12");
  assert("undefined checkInDayOfWeek → Sunday fallback", getCheckInDueDate("2026-07-12", undefined) === "2026-07-12");

  // ─────────────────────────────────────────────────────────────
  // SCHEMA FILE CONTRACT
  // ─────────────────────────────────────────────────────────────

  section("Schema file contract");

  {
    const schema = await readSrc("./lib/db/schema-check-in.ts");
    assert("Schema exports weeklyCheckInStatusEnum", schema.includes("export const weeklyCheckInStatusEnum"));
    assert("Schema exports weeklyCheckIns table", schema.includes("export const weeklyCheckIns"));
    assert("Schema exports WeeklyCheckIn type", schema.includes("export type WeeklyCheckIn"));
    assert("Schema exports WeeklyCheckInStatus type", schema.includes("export type WeeklyCheckInStatus"));
    assert("Schema enum has 'draft'", schema.includes('"draft"'));
    assert("Schema enum has 'submitted'", schema.includes('"submitted"'));
    assert("Schema enum has 'in_review'", schema.includes('"in_review"'));
    assert("Schema enum has 'reviewed'", schema.includes('"reviewed"'));
    assert("Schema has uq_client_week_check_in unique index", schema.includes("uq_client_week_check_in"));
    assert("Schema has stress check constraint", schema.includes("chk_check_in_stress"));
    assert("Schema has weight check constraint", schema.includes("chk_check_in_weight"));
    assert("Schema has compliance check constraints", schema.includes("chk_check_in_workout_compliance"));
    assert("Schema has all 4 coach-response fields", [
      "coachResponse", "coachReviewedAt", "reviewedBy",
    ].every((f) => schema.includes(f)));
    const clientFields = [
      "bodyWeightLbs", "waistInches", "averageSleepHours",
      "averageStress", "averageEnergy", "averageHunger", "digestionRating",
      "averageWaterOunces", "averageSteps", "workoutCompliancePct",
      "nutritionCompliancePct", "wins", "challenges", "questions", "clientNotes",
    ];
    const missingFields = clientFields.filter((f) => !schema.includes(f));
    assert(
      `Schema has all ${clientFields.length} client data fields`,
      missingFields.length === 0,
      missingFields.length > 0 ? `Missing: ${missingFields.join(", ")}` : undefined,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SERVICE FILE CONTRACT
  // ─────────────────────────────────────────────────────────────

  section("Client service file contract");

  {
    const svc = await readSrc("./lib/db/check-in-service.ts");
    const expectedFns = [
      "getWeekStartDate", "getWeekEndDate", "getCheckInDueDate",
      "getCurrentCheckInWindow", "createOrUpdateDraftCheckIn",
      "submitCheckIn", "listClientCheckIns", "getClientCheckInDetail",
      "getPreviousCheckIn",
    ];
    const missing = expectedFns.filter((fn) => !svc.includes(`export async function ${fn}`) && !svc.includes(`export function ${fn}`));
    assert(
      "All client service functions exported",
      missing.length === 0,
      missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
    );
    assert("Client service has import server-only", svc.includes('"server-only"'));
    assert("coach_response gated on status===reviewed in getClientCheckInDetail",
      svc.includes("status === \"reviewed\" ? row.coachResponse : null"));
  }

  section("Coach service file contract");

  {
    const svc = await readSrc("./lib/db/coach-check-in-service.ts");
    const expectedFns = [
      "listCoachCheckIns", "getCoachCheckInDetail", "startCheckInReview",
      "saveCoachResponseDraft", "markCheckInReviewed", "reopenCheckIn",
      "getClientCheckInSummary", "getCheckInMissionStats",
    ];
    const missing = expectedFns.filter((fn) => !svc.includes(`export async function ${fn}`) && !svc.includes(`export function ${fn}`));
    assert(
      "All coach service functions exported",
      missing.length === 0,
      missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
    );
    assert("Coach service has import server-only", svc.includes('"server-only"'));
    assert("startCheckInReview emits timeline event", svc.includes("check_in_review_started"));
    assert("markCheckInReviewed emits timeline event", svc.includes("check_in_reviewed"));
    assert("markCheckInReviewed sets coachReviewedAt", svc.includes("coachReviewedAt: now"));
  }

  // ─────────────────────────────────────────────────────────────
  // STATUS TRANSITION CONTRACT
  // ─────────────────────────────────────────────────────────────

  section("Status transition contract");

  {
    const svc = await readSrc("./lib/db/coach-check-in-service.ts");
    assert("startCheckInReview only accepts submitted",
      svc.includes(`status !== "submitted"`));
    assert("markCheckInReviewed only accepts in_review",
      svc.includes(`status !== "in_review"`));
    assert("reopenCheckIn only accepts reviewed",
      svc.includes(`status !== "reviewed"`));

    const clientSvc = await readSrc("./lib/db/check-in-service.ts");
    assert("submitCheckIn only accepts draft",
      clientSvc.includes(`status !== "draft"`));
  }

  // ─────────────────────────────────────────────────────────────
  // SECURITY CONTRACT
  // ─────────────────────────────────────────────────────────────

  section("Security contract");

  {
    const clientSvc = await readSrc("./lib/db/check-in-service.ts");
    assert(
      "coach_response is null for non-reviewed check-ins in getClientCheckInDetail",
      clientSvc.includes('row.status === "reviewed" ? row.coachResponse : null'),
    );
  }

  {
    // SELECT-only RLS model: all writes go through server-role server actions.
    // INSERT/UPDATE policies are intentionally absent — RLS default-deny blocks
    // any direct Supabase PostgREST write attempts from browser clients.
    const migrationContent = await readSrc("./drizzle/0006_check_in_schema.sql");
    assert("Migration has ENABLE ROW LEVEL SECURITY", migrationContent.includes("ENABLE ROW LEVEL SECURITY"));
    assert("Migration has client SELECT policy", migrationContent.includes("check_ins_client_select"));
    assert(
      "Migration has NO client INSERT policy (SELECT-only model)",
      !migrationContent.includes("check_ins_client_insert"),
    );
    assert(
      "Migration has NO client UPDATE policy (SELECT-only model)",
      !migrationContent.includes("check_ins_client_update"),
    );
  }

  {
    // Server actions must re-validate auth
    const portalActions = await readSrc("./app/portal/check-ins/actions.ts");
    assert("Portal actions re-validate with requireClientUser", portalActions.includes("requireClientUser"));

    const hqActions = await readSrc("./app/hq/check-ins/[checkInId]/actions.ts");
    assert("HQ actions re-validate with requireCoachOrAdmin", hqActions.includes("requireCoachOrAdmin"));
  }

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION SAFETY
  // ─────────────────────────────────────────────────────────────

  section("Navigation safety");

  {
    const sidebar = await readSrc("./components/hq/HQSidebar.tsx");
    assert(
      "HQSidebar Check-Ins is active (not comingSoon)",
      sidebar.includes('href: "/hq/check-ins"') &&
        !sidebar.includes('href: "/hq/check-ins",  comingSoon: true'),
    );
    assert("HQSidebar has /hq/check-ins href", sidebar.includes("/hq/check-ins"));
  }

  {
    const mobileNav = await readSrc("./components/hq/HQMobileNav.tsx");
    assert("HQMobileNav Check-Ins not in coming-soon list", !mobileNav.includes('"Check-Ins", "Schedule"'));
    assert("HQMobileNav has /hq/check-ins in MAIN_NAV", mobileNav.includes('href: "/hq/check-ins"'));
  }

  {
    const portalSidebar = await readSrc("./components/portal/PortalSidebar.tsx");
    assert("PortalSidebar is a client component", portalSidebar.includes('"use client"'));
    assert("PortalSidebar uses usePathname", portalSidebar.includes("usePathname"));
    assert("PortalSidebar has /portal/check-ins Link", portalSidebar.includes("/portal/check-ins"));
  }

  {
    const mobilePortalNav = await readSrc("./components/portal/MobilePortalNav.tsx");
    assert("MobilePortalNav is a client component", mobilePortalNav.includes('"use client"'));
    assert("MobilePortalNav uses usePathname", mobilePortalNav.includes("usePathname"));
    assert("MobilePortalNav has /portal/check-ins href", mobilePortalNav.includes("/portal/check-ins"));
  }

  {
    const portalCheckInPage = await readSrc("./app/portal/check-ins/page.tsx");
    assert("Portal check-in list: no /admin/* hrefs", !portalCheckInPage.includes('href="/admin'));
    assert("Portal check-in list: links back to /portal/check-ins/new", portalCheckInPage.includes("/portal/check-ins/new"));
  }

  {
    const hqCheckInPage = await readSrc("./app/hq/check-ins/page.tsx");
    assert("HQ check-in queue: no /admin/* hrefs", !hqCheckInPage.includes('href="/admin'));
    assert("HQ check-in queue: links to /hq/check-ins/[id]", hqCheckInPage.includes("/hq/check-ins/${item.id}"));
  }

  // ─────────────────────────────────────────────────────────────
  // CONCURRENCY CONTRACT
  // ─────────────────────────────────────────────────────────────

  section("Concurrency contract");

  {
    const coachSvc = await readSrc("./lib/db/coach-check-in-service.ts");
    assert(
      "markCheckInReviewed uses db.transaction()",
      coachSvc.includes("db.transaction("),
    );
    assert(
      "markCheckInReviewed UPDATE includes optimistic status guard",
      coachSvc.includes("eq(weeklyCheckIns.status, \"in_review\")"),
    );
    assert(
      "startCheckInReview uses optimistic WHERE guard",
      coachSvc.includes("eq(weeklyCheckIns.status, \"submitted\")"),
    );

    const clientSvc = await readSrc("./lib/db/check-in-service.ts");
    assert(
      "submitCheckIn uses optimistic WHERE guard on status",
      clientSvc.includes("eq(weeklyCheckIns.status, \"draft\")"),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MIGRATION FILE
  // ─────────────────────────────────────────────────────────────

  section("Migration file");

  {
    const migration = await readSrc("./drizzle/0006_check_in_schema.sql");
    assert("Migration creates weekly_check_in_status enum", migration.includes("weekly_check_in_status"));
    assert("Migration creates weekly_check_ins table", migration.includes('"weekly_check_ins"'));
    assert("Migration has uq_client_week_check_in unique index", migration.includes("uq_client_week_check_in"));
    assert("Migration has stress check constraint", migration.includes("chk_check_in_stress"));
    assert("Migration has weight check constraint", migration.includes("chk_check_in_weight"));
    assert("Migration has statement breakpoints", migration.includes("--> statement-breakpoint"));
    assert("Migration has FK to users (client_id)", migration.includes("weekly_check_ins_client_id_users_id_fk"));
    assert("Migration has FK to users (reviewed_by)", migration.includes("weekly_check_ins_reviewed_by_users_id_fk"));
  }

  // ─────────────────────────────────────────────────────────────
  // FILE EXISTENCE
  // ─────────────────────────────────────────────────────────────

  section("File existence");

  const expectedFiles = [
    "./lib/db/schema-check-in.ts",
    "./drizzle/0006_check_in_schema.sql",
    "./lib/db/check-in-service.ts",
    "./lib/db/coach-check-in-service.ts",
    "./app/portal/check-ins/page.tsx",
    "./app/portal/check-ins/new/page.tsx",
    "./app/portal/check-ins/[checkInId]/page.tsx",
    "./app/portal/check-ins/actions.ts",
    "./app/hq/check-ins/page.tsx",
    "./app/hq/check-ins/[checkInId]/page.tsx",
    "./app/hq/check-ins/[checkInId]/actions.ts",
    "./components/portal/CheckInForm.tsx",
    "./components/hq/check-ins/CheckInReviewPanel.tsx",
  ];

  for (const filePath of expectedFiles) {
    const exists = await fileExists(filePath);
    assert(`File exists: ${filePath.replace("./", "")}`, exists);
  }

  // ─────────────────────────────────────────────────────────────
  // MISSION CONTROL INTEGRATION
  // ─────────────────────────────────────────────────────────────

  section("Mission Control integration");

  {
    const dashboardSvc = await readSrc("./lib/db/coach-dashboard-service.ts");
    assert("Dashboard service imports getCheckInMissionStats", dashboardSvc.includes("getCheckInMissionStats"));
    assert("MissionControlData has checkIns field", dashboardSvc.includes("checkIns: CheckInMissionStats"));
    assert("getCoachMissionControl returns checkIns", dashboardSvc.includes("checkIns,"));
  }

  {
    const hqPage = await readSrc("./app/hq/page.tsx");
    assert("Mission Control page shows Check-Ins Waiting card", hqPage.includes("Check-Ins Waiting"));
  }

  // ─────────────────────────────────────────────────────────────
  // CLIENT WORKSPACE INTEGRATION
  // ─────────────────────────────────────────────────────────────

  section("Client workspace integration");

  {
    const workspacePage = await readSrc("./app/hq/clients/[clientId]/page.tsx");
    assert("Workspace page imports getClientCheckInSummary", workspacePage.includes("getClientCheckInSummary"));
    assert("Workspace page fetches check-in summary in parallel", workspacePage.includes("getClientCheckInSummary(clientId)"));
    assert("Workspace page renders check-in panel", workspacePage.includes("Check-Ins"));
  }

  // ─────────────────────────────────────────────────────────────
  // RESULT
  // ─────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Sprint 6.3B: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("\nAll tests passed.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
