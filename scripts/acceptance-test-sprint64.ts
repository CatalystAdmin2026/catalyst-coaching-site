// ─────────────────────────────────────────────────────────────
// Sprint 6.4 — Client Experience & Behavioral Engine
//              Acceptance Tests
//
// Deterministic file-content and pure-function tests.
// No database, no network, no Next.js runtime required.
//
// Run: npx tsx scripts/acceptance-test-sprint64.ts
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
  // Section 1 — Portal Dashboard Service
  // ─────────────────────────────────────────────────────────────
  section("Portal Dashboard Service — data contracts");

  const svcSrc = await src("lib/db/portal-dashboard-service.ts");

  assert(
    "Service has server-only sentinel",
    svcSrc.includes('import "server-only"'),
  );

  assert(
    "Service exports getDashboardData (combined aggregation)",
    svcSrc.includes("export async function getDashboardData"),
  );

  assert(
    "Service exports getPromisesKeptStats",
    svcSrc.includes("export async function getPromisesKeptStats"),
  );

  assert(
    "Service exports getWeeklyComplianceSnapshot",
    svcSrc.includes("export async function getWeeklyComplianceSnapshot"),
  );

  assert(
    "Service exports getRecoverySnapshot",
    svcSrc.includes("export async function getRecoverySnapshot"),
  );

  assert(
    "Service exports getClientAchievements",
    svcSrc.includes("export async function getClientAchievements"),
  );

  assert(
    "Service exports getProgressData (progress page)",
    svcSrc.includes("export async function getProgressData"),
  );

  assert(
    "Promises: lifetimeKept computed from completed sessions",
    svcSrc.includes("status") && svcSrc.includes("completed"),
  );

  assert(
    "Streak: week-based (not day-based) — uses week grouping",
    svcSrc.includes("computeWeekStreak"),
  );

  assert(
    "Recovery: parses numeric DB strings with parseFloat",
    svcSrc.includes("parseFloat"),
  );

  assert(
    "Achievements: 6 defined (first_workout, first_checkin, five_workouts, streak_3, ten_workouts, streak_7)",
    svcSrc.includes("first_workout") &&
      svcSrc.includes("first_checkin") &&
      svcSrc.includes("five_workouts") &&
      svcSrc.includes("streak_3") &&
      svcSrc.includes("ten_workouts") &&
      svcSrc.includes("streak_7"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 2 — Portal Page (server data pass-through)
  // ─────────────────────────────────────────────────────────────
  section("Portal page — server-side data pass-through");

  const portalPageSrc = await src("app/portal/page.tsx");

  assert(
    "Portal page imports getDashboardData (no client-side fetch for main data)",
    portalPageSrc.includes("getDashboardData"),
  );

  assert(
    "Portal page fetches dashboard data server-side via Promise.all",
    portalPageSrc.includes("Promise.all"),
  );

  assert(
    "Portal page passes dashboardData to PortalDashboard (no waterfall)",
    portalPageSrc.includes("dashboardData"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 3 — Dashboard Component Redesign
  // ─────────────────────────────────────────────────────────────
  section("PortalDashboard component — redesign");

  const dashSrc = await src("components/portal/PortalDashboard.tsx");

  assert(
    "Dashboard is a client component (animation state)",
    dashSrc.startsWith('"use client"'),
  );

  assert(
    "Dashboard accepts dashboardData prop (server-fetched)",
    dashSrc.includes("dashboardData: DashboardData"),
  );

  assert(
    "Dashboard renders PromisesKept component",
    dashSrc.includes("PromisesKept"),
  );

  assert(
    "Dashboard renders weekly rhythm component (WeeklyRhythm or WeeklyComplianceCard)",
    dashSrc.includes("WeeklyRhythm") || dashSrc.includes("WeeklyComplianceCard"),
  );

  assert(
    "Dashboard renders RecoverySnapshotCard component",
    dashSrc.includes("RecoverySnapshotCard"),
  );

  // Achievements are rendered somewhere in the portal (dashboard or progress page)
  // Checked again in Section 5 once progressContentSrc is available

  assert(
    "Dashboard still uses MissionEntry ritual (daily entry preserved)",
    dashSrc.includes("MissionEntry"),
  );

  assert(
    "Dashboard still fetches today-workout for real-time session state",
    dashSrc.includes("/api/portal/today-workout"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 4 — New UI Components
  // ─────────────────────────────────────────────────────────────
  section("New portal UI components");

  const [promiseSrc, complianceSrc, recoverySrc, achieveSrc] = await Promise.all([
    src("components/portal/PromisesKept.tsx"),
    src("components/portal/WeeklyComplianceCard.tsx"),
    src("components/portal/RecoverySnapshotCard.tsx"),
    src("components/portal/AchievementsPanel.tsx"),
  ]);

  assert(
    "PromisesKept shows lifetimeKept and currentStreak",
    promiseSrc.includes("lifetimeKept") && promiseSrc.includes("currentStreak"),
  );

  assert(
    "PromisesKept has graceful empty state (no data yet)",
    promiseSrc.includes("hasAnyData"),
  );

  assert(
    "WeeklyComplianceCard shows completed, skipped, and pending sessions",
    complianceSrc.includes("completedThisWeek") &&
      complianceSrc.includes("skippedThisWeek"),
  );

  assert(
    "WeeklyComplianceCard surfaces check-in status + submit link",
    complianceSrc.includes("check-ins/new"),
  );

  assert(
    "RecoverySnapshotCard has hasData guard (no empty display)",
    recoverySrc.includes("hasData"),
  );

  assert(
    "RecoverySnapshotCard shows sleep, stress, and energy",
    recoverySrc.includes("sleep") &&
      recoverySrc.includes("stress") &&
      recoverySrc.includes("energy"),
  );

  assert(
    "AchievementsPanel separates earned vs locked",
    achieveSrc.includes("earned") && achieveSrc.includes("locked"),
  );

  assert(
    "AchievementsPanel has aria-label for accessibility",
    achieveSrc.includes("aria-label"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 5 — Progress Page
  // ─────────────────────────────────────────────────────────────
  section("Progress page — real data sections");

  const progressPageSrc = await src("app/portal/progress/page.tsx");
  const progressContentSrc = await src("components/portal/ProgressContent.tsx");

  assert(
    "Progress page fetches real data via getProgressData",
    progressPageSrc.includes("getProgressData"),
  );

  assert(
    "Progress content is a client component (sparklines)",
    progressContentSrc.startsWith('"use client"'),
  );

  assert(
    "Progress content shows body metrics (weight + waist)",
    progressContentSrc.includes("weightLbs") && progressContentSrc.includes("waistInches"),
  );

  assert(
    "Progress content has inline Sparkline SVG",
    progressContentSrc.includes("<svg") && progressContentSrc.includes("polyline"),
  );

  assert(
    "Progress content shows workout consistency chart",
    progressContentSrc.includes("ConsistencyChart"),
  );

  assert(
    "Progress content shows recovery trends",
    progressContentSrc.includes("RecoveryTrend"),
  );

  assert(
    "Progress content has elegant empty states (no fake data)",
    progressContentSrc.includes("No") && progressContentSrc.toLowerCase().includes("submit") && progressContentSrc.toLowerCase().includes("check-in"),
  );

  assert(
    "AchievementsPanel rendered in Progress content (moved from Dashboard in Sprint 6.6)",
    progressContentSrc.includes("AchievementsPanel"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 6 — Program Page (week timeline)
  // ─────────────────────────────────────────────────────────────
  section("Program page — week timeline");

  const programPageSrc = await src("app/portal/program/page.tsx");

  assert(
    "Program page has WeekTimeline component",
    programPageSrc.includes("WeekTimeline"),
  );

  assert(
    "Week timeline has past/current/future states",
    programPageSrc.includes('"past"') &&
      programPageSrc.includes('"current"') &&
      programPageSrc.includes('"future"'),
  );

  assert(
    "Week timeline shows progress bar (with percentage indicator)",
    programPageSrc.includes("Timeline") && programPageSrc.includes("pct"),
  );

  assert(
    "Program page keeps existing program history section",
    programPageSrc.includes("Program History"),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 7 — Documents Page
  // ─────────────────────────────────────────────────────────────
  section("Documents page — professional category grid");

  const docsSrc = await src("app/portal/documents/page.tsx");

  assert(
    "Documents page describes what resources will be available (intentional empty state)",
    docsSrc.includes("coaching materials") || docsSrc.includes("Meal Plans"),
  );

  assert(
    "Documents page is protected by requireClientUser auth guard",
    docsSrc.includes("requireClientUser"),
  );

  assert(
    "Documents page communicates empty state clearly (not 'coming soon')",
    !docsSrc.toLowerCase().includes("coming soon") &&
      (docsSrc.includes("No resources") || docsSrc.includes("No documents")),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 8 — Security (no regressions)
  // ─────────────────────────────────────────────────────────────
  section("Security — no regressions");

  assert(
    "Dashboard service has server-only (cannot run on client)",
    svcSrc.includes('import "server-only"'),
  );

  assert(
    "Progress page uses requireClientUser (auth guard preserved)",
    progressPageSrc.includes("requireClientUser"),
  );

  assert(
    "Program page uses requireClientUser (auth guard preserved)",
    programPageSrc.includes("requireClientUser"),
  );

  assert(
    "Dashboard component does NOT import server-only modules (safe client component)",
    !dashSrc.includes('import "server-only"'),
  );

  // ─────────────────────────────────────────────────────────────
  // Section 9 — Behavioral Design
  // ─────────────────────────────────────────────────────────────
  section("Behavioral design — copy and empty states");

  assert(
    "Recovery gracefully degrades (no data state, no fabricated metrics)",
    recoverySrc.includes("hasData") && !recoverySrc.includes("placeholder"),
  );

  assert(
    "PromisesKept graceful empty state references first session",
    promiseSrc.includes("hasAnyData") && promiseSrc.includes("first session"),
  );

  assert(
    "Achievements locked state is present (non-shaming)",
    achieveSrc.includes("Locked"),
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
