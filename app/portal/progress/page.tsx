import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import {
  getProgressData,
  getDashboardData,
  type BodyMetricEntry,
  type PromisesKeptStats,
  type WeeklySessionCount,
  type GoalProgress,
  type Achievement,
} from "@/lib/db/portal-dashboard-service";
import type { VictoryMoment } from "@/components/portal/ProgressContent";
import PortalShell from "@/components/portal/PortalShell";
import ProgressContent from "@/components/portal/ProgressContent";

export const dynamic = "force-dynamic";

function buildNarrativeSummary({
  promises,
  bodyMetrics,
  weeklySessionCounts,
  goalProgress,
}: {
  promises: PromisesKeptStats;
  bodyMetrics: BodyMetricEntry[];
  weeklySessionCounts: WeeklySessionCount[];
  goalProgress: GoalProgress;
}): string {
  const hasAnyData =
    promises.hasAnyData || bodyMetrics.some((m) => m.weightLbs !== null);

  if (!hasAnyData) {
    if (goalProgress.goal) {
      return "Your progress record is just getting started. Submit your first check-in to begin building the picture your coach will use to guide your program.";
    }
    return "The record begins here.";
  }

  // Adherence from last 4 weeks of session data
  const recent = weeklySessionCounts.slice(0, 4);
  const totalScheduled = recent.reduce((s, w) => s + w.total, 0);
  const totalCompleted = recent.reduce((s, w) => s + w.completed, 0);
  const adherencePct =
    totalScheduled > 0
      ? Math.round((totalCompleted / totalScheduled) * 100)
      : null;
  const weeksOfData = weeklySessionCounts.length;
  const wk = weeksOfData === 1 ? "week" : "weeks";

  const weightPts = bodyMetrics
    .map((m) => m.weightLbs)
    .filter((v): v is number => v !== null);
  const weightDelta =
    weightPts.length >= 2
      ? weightPts[0] - weightPts[weightPts.length - 1]
      : null;

  if (adherencePct !== null && adherencePct >= 85) {
    const qual = adherencePct >= 92 ? "exceptional" : "strong";
    if (weightDelta !== null && weightDelta >= 1) {
      return `You're making ${qual} progress. Over the last ${weeksOfData} ${wk} you've completed ${adherencePct}% of your planned workouts, losing ${weightDelta.toFixed(1)} lbs in the process.`;
    }
    if (weightDelta !== null && weightDelta <= -1) {
      return `Your consistency has been ${qual} — ${adherencePct}% of sessions completed over the last ${weeksOfData} ${wk}. Weight has trended up ${Math.abs(weightDelta).toFixed(1)} lbs, which may reflect intentional progress depending on your goal.`;
    }
    return `Your consistency has been ${qual}. ${adherencePct}% of sessions completed over the last ${weeksOfData} ${wk}. Physical results often lag behavioral change by several weeks — your body is catching up.`;
  }

  if (adherencePct !== null && adherencePct >= 60) {
    return `You're building your consistency — ${adherencePct}% of sessions completed over the last ${weeksOfData} ${wk}. Each session is a deposit that compounds over time.`;
  }

  if (promises.lifetimeKept > 0) {
    const kept = promises.lifetimeKept;
    return `${kept} ${kept === 1 ? "session" : "sessions"} completed. Every promise kept is a data point your body remembers — the record is growing.`;
  }

  return "Your progress record is building. Log sessions and submit weekly check-ins to unlock your full coaching picture.";
}

// Returns the single strongest positive truth from the client's recent data.
// Priority order: perfect adherence → multi-week perfect run → physical progress
// with strong adherence → resilience through high stress → multi-week streak →
// general positive momentum → difficult week (supportive) → baseline.
// Never fabricates success. Never shames. All claims are grounded in data.
function buildVictoryMoment({
  promises,
  bodyMetrics,
  weeklySessionCounts,
  isOnboarding,
}: {
  promises: PromisesKeptStats;
  bodyMetrics: BodyMetricEntry[];
  weeklySessionCounts: WeeklySessionCount[];
  goalProgress: GoalProgress;
  achievements: Achievement[];
  isOnboarding: boolean;
}): VictoryMoment {
  // Day 1 — identity anchor before any data exists
  if (isOnboarding) {
    return {
      headline: "Your record starts here.",
      subtext: "Every promise you keep from this point forward becomes part of who you are becoming.",
      accent: "neutral",
    };
  }

  const lastWeek = weeklySessionCounts[0] ?? null;
  const recentWeeks = weeklySessionCounts.slice(0, 4);
  const totalScheduled = recentWeeks.reduce((s, w) => s + w.total, 0);
  const totalCompleted = recentWeeks.reduce((s, w) => s + w.completed, 0);
  const recentAdherence = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : null;

  // 1. Perfect last week (100% completion, meaningful session count)
  if (lastWeek && lastWeek.total >= 2 && lastWeek.completed === lastWeek.total) {
    const s = lastWeek.total === 1 ? "session" : "sessions";
    return {
      headline: "You kept every promise you made to yourself this week.",
      subtext: `${lastWeek.total} planned ${s}. ${lastWeek.total} completed. That is what follow-through looks like.`,
      accent: "emerald",
    };
  }

  // 2. Two or more consecutive perfect weeks
  const perfectWeeks = recentWeeks.filter((w) => w.total > 0 && w.completed === w.total);
  if (perfectWeeks.length >= 2) {
    return {
      headline: "This was your strongest stretch yet.",
      subtext: `${perfectWeeks.length} consecutive weeks of complete execution. The pattern is becoming permanent.`,
      accent: "emerald",
    };
  }

  // 3. Meaningful physical progress while adherence is strong
  const weightPts = bodyMetrics.map((m) => m.weightLbs).filter((v): v is number => v !== null);
  if (weightPts.length >= 2 && recentAdherence !== null && recentAdherence >= 75) {
    const startWeight = weightPts[weightPts.length - 1];
    const currentWeight = weightPts[0];
    const delta = startWeight - currentWeight; // positive = lost weight
    if (delta >= 3) {
      return {
        headline: "Your consistency is showing up in the results.",
        subtext: `${delta.toFixed(1)} lbs down since you started — and your adherence has been strong. The work is translating.`,
        accent: "gold",
      };
    }
  }

  // 4. Resilient performance: high stress but still showed up
  const recentMetrics = bodyMetrics.slice(0, 3);
  const highStressWeeks = recentMetrics.filter((m) => m.stress !== null && m.stress >= 7);
  if (highStressWeeks.length > 0 && recentAdherence !== null && recentAdherence >= 70) {
    return {
      headline: "You stayed consistent when the week got difficult.",
      subtext: `Your stress was elevated, but you still completed ${recentAdherence}% of your planned training. That is resilience.`,
      accent: "gold",
    };
  }

  // 5. Multi-week streak
  if (promises.currentStreak >= 4) {
    return {
      headline: "You are building real momentum.",
      subtext: `${promises.currentStreak} consecutive weeks of consistent execution — and results follow patterns like this.`,
      accent: "gold",
    };
  }

  // 6. General positive adherence
  if (recentAdherence !== null && recentAdherence >= 60) {
    return {
      headline: "The momentum is building.",
      subtext: `${recentAdherence}% of planned sessions completed over the last ${recentWeeks.length} ${recentWeeks.length === 1 ? "week" : "weeks"}. Every week you show up, the habit deepens.`,
      accent: "neutral",
    };
  }

  // 7. Difficult week — honest, supportive, action-oriented
  if (lastWeek && lastWeek.total > 0 && lastWeek.completed < Math.ceil(lastWeek.total * 0.5)) {
    return {
      headline: "One difficult week does not erase your progress.",
      subtext: "Your next opportunity to rebuild momentum starts now.",
      accent: "neutral",
    };
  }

  // 8. Has some session data — baseline recognition
  if (promises.lifetimeKept > 0) {
    const s = promises.lifetimeKept === 1 ? "session" : "sessions";
    return {
      headline: "You are showing up.",
      subtext: `${promises.lifetimeKept} ${s} completed. The record is growing.`,
      accent: "neutral",
    };
  }

  // 9. Has check-in data but no sessions yet — building baseline
  if (bodyMetrics.length > 0) {
    return {
      headline: "You are building your baseline.",
      subtext: "Each completed check-in gives your coach a clearer picture of what is working.",
      accent: "neutral",
    };
  }

  // 10. Fallback
  return {
    headline: "Your record is building.",
    subtext: "Log sessions and submit weekly check-ins to unlock your full progress picture.",
    accent: "neutral",
  };
}

export default async function ProgressPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const [profile, progressData, dashboardData] = await Promise.all([
    getClientProfile(dbUser.id),
    getProgressData(dbUser.id),
    getDashboardData(dbUser.id),
  ]);

  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  const weightValues = progressData.bodyMetrics.map((m) => m.weightLbs).filter((v): v is number => v !== null);
  const waistValues = progressData.bodyMetrics.map((m) => m.waistInches).filter((v): v is number => v !== null);
  const isOnboarding =
    weightValues.length === 0 &&
    waistValues.length === 0 &&
    progressData.weeklySessionCounts.length === 0 &&
    dashboardData.achievements.filter((a) => a.earned).length === 0;

  const narrativeSummary = buildNarrativeSummary({
    promises: dashboardData.promises,
    bodyMetrics: progressData.bodyMetrics,
    weeklySessionCounts: progressData.weeklySessionCounts,
    goalProgress: progressData.goalProgress,
  });

  const victoryMoment = buildVictoryMoment({
    promises: dashboardData.promises,
    bodyMetrics: progressData.bodyMetrics,
    weeklySessionCounts: progressData.weeklySessionCounts,
    goalProgress: progressData.goalProgress,
    achievements: dashboardData.achievements,
    isOnboarding,
  });

  return (
    <PortalShell clientName={clientName}>
      <div>
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
          Progress
        </p>
      </div>
      <ProgressContent
        data={progressData}
        achievements={dashboardData.achievements}
        narrativeSummary={narrativeSummary}
        promises={dashboardData.promises}
        victoryMoment={victoryMoment}
        newlyEarnedMilestoneKeys={dashboardData.newlyEarnedMilestoneKeys}
      />
    </PortalShell>
  );
}
