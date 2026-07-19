// ─────────────────────────────────────────────────────────────
// Catalyst OS — Portal Dashboard Service (Sprint 6.4)
//
// SERVER-ONLY — never import from a Client Component.
//
// Aggregates dashboard data from workout_sessions and
// weekly_check_ins into structured DTOs for the client portal.
// All heavy lifting happens here; UI components receive plain
// serializable objects — no Date values, no DB row types.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, and, gte, lte, sql, desc, ne, isNotNull } from "drizzle-orm";
import { getDb } from "./client";
import { weeklyCheckIns } from "./schema-check-in";
import { workoutSessions } from "./schema-program";

// ─────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────

export interface PromisesKeptStats {
  lifetimeKept: number;
  currentStreak: number;
  todayKept: boolean | null;
  hasAnyData: boolean;
}

export interface WeeklyComplianceSnapshot {
  sessionsThisWeek: number;
  completedThisWeek: number;
  skippedThisWeek: number;
  checkInStatus: string | null;
  weekStartDate: string;
  weekEndDate: string;
}

export interface RecoverySnapshot {
  hasData: boolean;
  sleep: number | null;
  stress: number | null;
  energy: number | null;
  weekLabel: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  category: "consistency" | "milestone" | "accountability";
}

export interface BodyMetricEntry {
  weekStartDate: string;
  weekLabel: string;
  weightLbs: number | null;
  waistInches: number | null;
  sleep: number | null;
  stress: number | null;
  energy: number | null;
  workoutCompliancePct: number | null;
}

export interface WeeklySessionCount {
  weekStartDate: string;
  weekLabel: string;
  completed: number;
  total: number;
}

export interface DashboardData {
  promises: PromisesKeptStats;
  weeklyCompliance: WeeklyComplianceSnapshot;
  recovery: RecoverySnapshot;
  achievements: Achievement[];
}

export interface ProgressData {
  bodyMetrics: BodyMetricEntry[];
  weeklySessionCounts: WeeklySessionCount[];
  hasBodyData: boolean;
  hasSessionData: boolean;
}

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStartStr: string): string {
  const d = new Date(weekStartStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function fmtWeekLabel(weekStartStr: string): string {
  return new Date(weekStartStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Consecutive-week streak: counts how many weeks in a row (going
// backward from the most recent week with a completion) the client
// had at least one completed session. Current-week completions count;
// a week with no completions breaks the streak.
function computeWeekStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const weekSet = new Set<string>();
  for (const d of completedDates) {
    weekSet.add(getWeekStart(d));
  }

  const sortedWeeks = Array.from(weekSet).sort().reverse();
  if (sortedWeeks.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = new Date(sortedWeeks[i - 1] + "T12:00:00Z");
    const curr = new Date(sortedWeeks[i] + "T12:00:00Z");
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff === 7) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ─────────────────────────────────────────────────────────────
// PROMISES KEPT
// ─────────────────────────────────────────────────────────────

export async function getPromisesKeptStats(
  clientId: string,
): Promise<PromisesKeptStats> {
  const db = getDb();

  const [{ lifetimeKept }] = await db
    .select({ lifetimeKept: sql<number>`count(*)::int` })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        eq(workoutSessions.status, "completed"),
      ),
    );

  if (lifetimeKept === 0) {
    return { lifetimeKept: 0, currentStreak: 0, todayKept: null, hasAnyData: false };
  }

  // Dates for streak calculation (use scheduledDate; fall back to completedAt)
  const completed = await db
    .select({
      scheduledDate: workoutSessions.scheduledDate,
      completedAt: workoutSessions.completedAt,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        eq(workoutSessions.status, "completed"),
      ),
    );

  const dates = completed
    .map(
      (s) =>
        s.scheduledDate ??
        s.completedAt?.toISOString().slice(0, 10),
    )
    .filter(Boolean) as string[];

  const currentStreak = computeWeekStreak(dates);

  // Today's promise status
  const todayStr = new Date().toISOString().slice(0, 10);
  const [todaySession] = await db
    .select({ status: workoutSessions.status })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        eq(workoutSessions.scheduledDate, todayStr),
      ),
    )
    .limit(1);

  const todayKept = todaySession
    ? todaySession.status === "completed"
    : null;

  return { lifetimeKept, currentStreak, todayKept, hasAnyData: true };
}

// ─────────────────────────────────────────────────────────────
// WEEKLY COMPLIANCE
// ─────────────────────────────────────────────────────────────

export async function getWeeklyComplianceSnapshot(
  clientId: string,
): Promise<WeeklyComplianceSnapshot> {
  const db = getDb();

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart(todayStr);
  const weekEnd = getWeekEnd(weekStart);

  const sessions = await db
    .select({ status: workoutSessions.status })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.clientId, clientId),
        gte(workoutSessions.scheduledDate, weekStart),
        lte(workoutSessions.scheduledDate, weekEnd),
      ),
    );

  const completedThisWeek = sessions.filter((s) => s.status === "completed").length;
  const skippedThisWeek = sessions.filter((s) => s.status === "skipped").length;

  const [checkIn] = await db
    .select({ status: weeklyCheckIns.status })
    .from(weeklyCheckIns)
    .where(
      and(
        eq(weeklyCheckIns.clientId, clientId),
        eq(weeklyCheckIns.weekStartDate, weekStart),
      ),
    )
    .limit(1);

  return {
    sessionsThisWeek: sessions.length,
    completedThisWeek,
    skippedThisWeek,
    checkInStatus: checkIn?.status ?? null,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
  };
}

// ─────────────────────────────────────────────────────────────
// RECOVERY SNAPSHOT
// ─────────────────────────────────────────────────────────────

export async function getRecoverySnapshot(
  clientId: string,
): Promise<RecoverySnapshot> {
  const db = getDb();

  const [row] = await db
    .select({
      averageSleepHours: weeklyCheckIns.averageSleepHours,
      averageStress: weeklyCheckIns.averageStress,
      averageEnergy: weeklyCheckIns.averageEnergy,
      weekStartDate: weeklyCheckIns.weekStartDate,
    })
    .from(weeklyCheckIns)
    .where(
      and(
        eq(weeklyCheckIns.clientId, clientId),
        ne(weeklyCheckIns.status, "draft"),
      ),
    )
    .orderBy(desc(weeklyCheckIns.submittedAt))
    .limit(1);

  if (!row) {
    return { hasData: false, sleep: null, stress: null, energy: null, weekLabel: null };
  }

  const sleep = row.averageSleepHours ? parseFloat(row.averageSleepHours) : null;

  return {
    hasData: sleep !== null || row.averageStress !== null || row.averageEnergy !== null,
    sleep,
    stress: row.averageStress,
    energy: row.averageEnergy,
    weekLabel: row.weekStartDate ? fmtWeekLabel(row.weekStartDate) : null,
  };
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────

export async function getClientAchievements(
  clientId: string,
): Promise<Achievement[]> {
  const db = getDb();

  const [completedCount, checkInCount, completedDates] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.clientId, clientId),
          eq(workoutSessions.status, "completed"),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(weeklyCheckIns)
      .where(
        and(
          eq(weeklyCheckIns.clientId, clientId),
          ne(weeklyCheckIns.status, "draft"),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({
        scheduledDate: workoutSessions.scheduledDate,
        completedAt: workoutSessions.completedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.clientId, clientId),
          eq(workoutSessions.status, "completed"),
        ),
      )
      .then((rows) =>
        rows
          .map((s) => s.scheduledDate ?? s.completedAt?.toISOString().slice(0, 10))
          .filter(Boolean) as string[],
      ),
  ]);

  const streak = computeWeekStreak(completedDates);

  return [
    {
      id: "first_workout",
      title: "First Step",
      description: "Complete your first workout",
      earned: completedCount >= 1,
      category: "milestone",
    },
    {
      id: "first_checkin",
      title: "Accountable",
      description: "Submit your first weekly check-in",
      earned: checkInCount >= 1,
      category: "accountability",
    },
    {
      id: "five_workouts",
      title: "Building Momentum",
      description: "Complete 5 workouts",
      earned: completedCount >= 5,
      category: "milestone",
    },
    {
      id: "streak_3",
      title: "3-Week Standard",
      description: "Stay consistent for 3 consecutive weeks",
      earned: streak >= 3,
      category: "consistency",
    },
    {
      id: "ten_workouts",
      title: "Habit Forged",
      description: "Complete 10 workouts",
      earned: completedCount >= 10,
      category: "milestone",
    },
    {
      id: "streak_7",
      title: "7-Week Streak",
      description: "Maintain a 7-week consistency streak",
      earned: streak >= 7,
      category: "consistency",
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// PROGRESS DATA
// ─────────────────────────────────────────────────────────────

export async function getProgressData(clientId: string): Promise<ProgressData> {
  const db = getDb();

  const [checkIns, weeklySessionCounts] = await Promise.all([
    // Last 12 submitted/reviewed check-ins with body metrics
    db
      .select({
        weekStartDate: weeklyCheckIns.weekStartDate,
        bodyWeightLbs: weeklyCheckIns.bodyWeightLbs,
        waistInches: weeklyCheckIns.waistInches,
        averageSleepHours: weeklyCheckIns.averageSleepHours,
        averageStress: weeklyCheckIns.averageStress,
        averageEnergy: weeklyCheckIns.averageEnergy,
        workoutCompliancePct: weeklyCheckIns.workoutCompliancePct,
      })
      .from(weeklyCheckIns)
      .where(
        and(
          eq(weeklyCheckIns.clientId, clientId),
          ne(weeklyCheckIns.status, "draft"),
        ),
      )
      .orderBy(desc(weeklyCheckIns.weekStartDate))
      .limit(12),

    // Sessions per week for consistency chart
    db
      .select({
        weekStart: sql<string>`date_trunc('week', ${workoutSessions.scheduledDate}::timestamp)::date::text`,
        completed: sql<number>`count(*) filter (where ${workoutSessions.status} = 'completed')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.clientId, clientId),
          isNotNull(workoutSessions.scheduledDate),
        ),
      )
      .groupBy(sql`date_trunc('week', ${workoutSessions.scheduledDate}::timestamp)`)
      .orderBy(sql`date_trunc('week', ${workoutSessions.scheduledDate}::timestamp) desc`)
      .limit(12),
  ]);

  const bodyMetrics: BodyMetricEntry[] = checkIns.map((c) => ({
    weekStartDate: c.weekStartDate,
    weekLabel: fmtWeekLabel(c.weekStartDate),
    weightLbs: c.bodyWeightLbs ? parseFloat(c.bodyWeightLbs) : null,
    waistInches: c.waistInches ? parseFloat(c.waistInches) : null,
    sleep: c.averageSleepHours ? parseFloat(c.averageSleepHours) : null,
    stress: c.averageStress,
    energy: c.averageEnergy,
    workoutCompliancePct: c.workoutCompliancePct,
  }));

  const weeklySessionCountsFormatted: WeeklySessionCount[] = weeklySessionCounts
    .filter((w) => w.weekStart)
    .map((w) => ({
      weekStartDate: w.weekStart,
      weekLabel: fmtWeekLabel(w.weekStart),
      completed: w.completed,
      total: w.total,
    }));

  const hasBodyData = bodyMetrics.some(
    (m) => m.weightLbs !== null || m.waistInches !== null,
  );

  return {
    bodyMetrics,
    weeklySessionCounts: weeklySessionCountsFormatted,
    hasBodyData,
    hasSessionData: weeklySessionCountsFormatted.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────
// COMBINED DASHBOARD DATA
// ─────────────────────────────────────────────────────────────

export async function getDashboardData(clientId: string): Promise<DashboardData> {
  const [promises, weeklyCompliance, recovery, achievements] = await Promise.all([
    getPromisesKeptStats(clientId),
    getWeeklyComplianceSnapshot(clientId),
    getRecoverySnapshot(clientId),
    getClientAchievements(clientId),
  ]);

  return { promises, weeklyCompliance, recovery, achievements };
}
