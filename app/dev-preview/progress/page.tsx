// Temporary dev preview — delete after visual QA
import ProgressContent, { type VictoryMoment } from "@/components/portal/ProgressContent";
import type {
  ProgressData,
  Achievement,
  PromisesKeptStats,
} from "@/lib/db/portal-dashboard-service";

// ─── State 1: Perfect adherence week ──────────────────────────

const perfectData: ProgressData = {
  bodyMetrics: [
    { weekStartDate: "2026-06-30", weekLabel: "Jun 30", weightLbs: 188.2, waistInches: 35.5, sleep: 7.2, stress: 5, energy: 6, workoutCompliancePct: 100 },
    { weekStartDate: "2026-06-23", weekLabel: "Jun 23", weightLbs: 190.1, waistInches: 35.8, sleep: 6.8, stress: 6, energy: 5, workoutCompliancePct: 75 },
    { weekStartDate: "2026-06-16", weekLabel: "Jun 16", weightLbs: 191.4, waistInches: 36.2, sleep: 7.0, stress: 5, energy: 7, workoutCompliancePct: 100 },
    { weekStartDate: "2026-06-09", weekLabel: "Jun 9",  weightLbs: 192.8, waistInches: 36.6, sleep: 6.5, stress: 7, energy: 5, workoutCompliancePct: 50 },
    { weekStartDate: "2026-06-02", weekLabel: "Jun 2",  weightLbs: 193.5, waistInches: 36.9, sleep: 7.1, stress: 4, energy: 7, workoutCompliancePct: 75 },
    { weekStartDate: "2026-05-26", weekLabel: "May 26", weightLbs: 194.8, waistInches: 37.1, sleep: 6.9, stress: 5, energy: 6, workoutCompliancePct: 100 },
  ],
  weeklySessionCounts: [
    { weekStartDate: "2026-06-30", weekLabel: "Jun 30", completed: 3, total: 3 },
    { weekStartDate: "2026-06-23", weekLabel: "Jun 23", completed: 3, total: 4 },
    { weekStartDate: "2026-06-16", weekLabel: "Jun 16", completed: 4, total: 4 },
    { weekStartDate: "2026-06-09", weekLabel: "Jun 9",  completed: 2, total: 4 },
    { weekStartDate: "2026-06-02", weekLabel: "Jun 2",  completed: 3, total: 4 },
    { weekStartDate: "2026-05-26", weekLabel: "May 26", completed: 4, total: 4 },
    { weekStartDate: "2026-05-19", weekLabel: "May 19", completed: 4, total: 4 },
    { weekStartDate: "2026-05-12", weekLabel: "May 12", completed: 3, total: 4 },
  ],
  hasBodyData: true,
  hasSessionData: true,
  goalProgress: {
    goal: {
      id: "goal-1",
      goalType: "fat_loss",
      description: "Lose 25 lbs by December 2026 and build a sustainable training habit I can maintain year-round.",
      targetValue: 175,
      targetUnit: "lbs",
      targetDate: "2026-12-01",
      startedAt: "2026-05-01",
    },
    paceStatus: "on_pace",
    percentComplete: 31,
    currentValue: 188.2,
    startValue: 194.8,
    distance: {
      completedValue: 6.6,
      remainingValue: 13.2,
      unit: "lbs",
      completedLabel: "6.6 lbs completed",
      remainingLabel: "13.2 lbs remaining",
    },
    qualitativeState: null,
  },
  coachVoice: {
    response: "Six weeks in and the consistency is real — you've only missed one session the entire month. The weight is moving at exactly the pace it should for sustainable fat loss. Keep the weekend sessions locked in; that's where most people slip.",
    weekLabel: "Jun 30",
  },
};

const perfectAchievements: Achievement[] = [
  { id: "a1", title: "First Check-In",     description: "Submitted your first weekly check-in.",        earned: true,  category: "accountability" },
  { id: "a2", title: "First Promise Kept", description: "Completed your very first scheduled session.", earned: true,  category: "milestone" },
  { id: "a3", title: "10 Promises Kept",   description: "Ten sessions completed. The habit is forming.", earned: true, category: "milestone" },
  { id: "a4", title: "Four-Week Standard", description: "Four full weeks of consistent training.",       earned: true,  category: "consistency" },
  { id: "a5", title: "Three Months In",    description: "Twelve check-ins submitted.",                   earned: false, category: "accountability" },
  { id: "a6", title: "25 Promises Kept",   description: "Twenty-five sessions. Building something real.", earned: false, category: "milestone" },
  { id: "a7", title: "Eight-Week Commitment", description: "Eight consecutive weeks of training.",       earned: false, category: "consistency" },
  { id: "a8", title: "50 Promises Kept",   description: "Fifty sessions completed.",                     earned: false, category: "milestone" },
  { id: "a9", title: "Twelve-Week Standard", description: "Twelve weeks of consistent training.",        earned: false, category: "consistency" },
  { id: "a10",title: "100 Promises Kept",  description: "One hundred sessions. Rare commitment.",        earned: false, category: "milestone" },
  { id: "a11",title: "First Program Complete", description: "Completed your first full coaching program.", earned: false, category: "milestone" },
];

const perfectPromises: PromisesKeptStats = {
  lifetimeKept: 26, currentStreak: 4, dailyStreak: 0, todayKept: null, hasAnyData: true,
};

const perfectVictory: VictoryMoment = {
  headline: "You kept every promise you made to yourself this week.",
  subtext: "3 planned sessions. 3 completed. That is what follow-through looks like.",
  accent: "emerald",
};

// ─── State 2: Non-quantifiable goal ───────────────────────────

const nonQuantData: ProgressData = {
  ...perfectData,
  goalProgress: {
    goal: {
      id: "goal-2",
      goalType: "general_health",
      description: "Build a sustainable fitness routine and improve how I feel day-to-day.",
      targetValue: null,
      targetUnit: null,
      targetDate: null,
      startedAt: "2026-05-01",
    },
    paceStatus: "in_progress",
    percentComplete: null,
    currentValue: null,
    startValue: null,
    distance: null,
    qualitativeState: "Building your baseline",
  },
  coachVoice: null,
};

const nonQuantVictory: VictoryMoment = {
  headline: "Your consistency is showing up in the results.",
  subtext: "6.6 lbs down since you started — and your adherence has been strong. The work is translating.",
  accent: "gold",
};

// ─── State 3: Newly earned milestone (localStorage empty = all earned animate) ──

const newMilestoneData: ProgressData = {
  ...perfectData,
  weeklySessionCounts: perfectData.weeklySessionCounts.slice(0, 3),
  coachVoice: null,
};

const newMilestoneAchievements: Achievement[] = [
  { id: "b1", title: "First Check-In",     description: "Submitted your first weekly check-in.",        earned: true,  category: "accountability" },
  { id: "b2", title: "First Promise Kept", description: "Completed your very first scheduled session.", earned: true,  category: "milestone" },
  { id: "b3", title: "10 Promises Kept",   description: "Ten sessions completed. The habit is forming.", earned: true, category: "milestone" },
  { id: "b4", title: "Four-Week Standard", description: "Four full weeks of consistent training.",       earned: false, category: "consistency" },
  { id: "b5", title: "Three Months In",    description: "Twelve check-ins submitted.",                   earned: false, category: "accountability" },
  { id: "b6", title: "25 Promises Kept",   description: "Twenty-five sessions. Building something real.", earned: false, category: "milestone" },
  { id: "b7", title: "Eight-Week Commitment", description: "Eight consecutive weeks of training.",       earned: false, category: "consistency" },
  { id: "b8", title: "50 Promises Kept",   description: "Fifty sessions completed.",                     earned: false, category: "milestone" },
  { id: "b9", title: "Twelve-Week Standard", description: "Twelve weeks of consistent training.",        earned: false, category: "consistency" },
  { id: "b10",title: "100 Promises Kept",  description: "One hundred sessions. Rare commitment.",        earned: false, category: "milestone" },
  { id: "b11",title: "First Program Complete", description: "Completed your first full coaching program.", earned: false, category: "milestone" },
];

const newMilestonePromises: PromisesKeptStats = {
  lifetimeKept: 10, currentStreak: 3, dailyStreak: 0, todayKept: null, hasAnyData: true,
};

const newMilestoneVictory: VictoryMoment = {
  headline: "You are building real momentum.",
  subtext: "3 consecutive weeks of consistent execution — and results follow patterns like this.",
  accent: "gold",
};

// ─── State 4: Day 1 ───────────────────────────────────────────

const dayOneData: ProgressData = {
  bodyMetrics: [],
  weeklySessionCounts: [],
  hasBodyData: false,
  hasSessionData: false,
  goalProgress: {
    goal: {
      id: "goal-4",
      goalType: "fat_loss",
      description: "Lose 25 lbs by December 2026.",
      targetValue: 175,
      targetUnit: "lbs",
      targetDate: "2026-12-01",
      startedAt: "2026-07-23",
    },
    paceStatus: "in_progress",
    percentComplete: null,
    currentValue: null,
    startValue: null,
    distance: null,
    qualitativeState: "Each check-in builds your progress picture",
  },
  coachVoice: null,
};

const dayOneAchievements: Achievement[] = [
  { id: "c1", title: "First Check-In",      description: "Submitted your first weekly check-in.",         earned: false, category: "accountability" },
  { id: "c2", title: "First Promise Kept",  description: "Completed your very first scheduled session.",  earned: false, category: "milestone" },
  { id: "c3", title: "10 Promises Kept",    description: "Ten sessions completed. The habit is forming.", earned: false, category: "milestone" },
  { id: "c4", title: "Four-Week Standard",  description: "Four full weeks of consistent training.",       earned: false, category: "consistency" },
  { id: "c5", title: "25 Promises Kept",    description: "Twenty-five sessions. Building something real.", earned: false, category: "milestone" },
  { id: "c6", title: "Eight-Week Commitment", description: "Eight consecutive weeks of training.",        earned: false, category: "consistency" },
  { id: "c7", title: "50 Promises Kept",    description: "Fifty sessions completed.",                     earned: false, category: "milestone" },
  { id: "c8", title: "Twelve-Week Standard", description: "Twelve weeks of consistent training.",         earned: false, category: "consistency" },
  { id: "c9", title: "Three Months In",     description: "Twelve check-ins submitted.",                   earned: false, category: "accountability" },
  { id: "c10",title: "100 Promises Kept",   description: "One hundred sessions. Rare commitment.",        earned: false, category: "milestone" },
  { id: "c11",title: "First Program Complete", description: "Completed your first full coaching program.", earned: false, category: "milestone" },
];

const dayOnePromises: PromisesKeptStats = {
  lifetimeKept: 0, currentStreak: 0, dailyStreak: 0, todayKept: null, hasAnyData: false,
};

const dayOneVictory: VictoryMoment = {
  headline: "Your record starts here.",
  subtext: "Every promise you keep from this point forward becomes part of who you are becoming.",
  accent: "neutral",
};

// ─── State 5: Difficult week ───────────────────────────────────

const difficultData: ProgressData = {
  ...perfectData,
  weeklySessionCounts: [
    { weekStartDate: "2026-06-30", weekLabel: "Jun 30", completed: 1, total: 4 },
    { weekStartDate: "2026-06-23", weekLabel: "Jun 23", completed: 3, total: 4 },
    { weekStartDate: "2026-06-16", weekLabel: "Jun 16", completed: 4, total: 4 },
    { weekStartDate: "2026-06-09", weekLabel: "Jun 9",  completed: 4, total: 4 },
    { weekStartDate: "2026-06-02", weekLabel: "Jun 2",  completed: 3, total: 4 },
  ],
  coachVoice: null,
};

const difficultVictory: VictoryMoment = {
  headline: "One difficult week does not erase your progress.",
  subtext: "Your next opportunity to rebuild momentum starts now.",
  accent: "neutral",
};

// ─── Render ───────────────────────────────────────────────────

function StateSection({
  label,
  id,
  data,
  achievements,
  promises,
  narrativeSummary,
  victoryMoment,
  newlyEarnedMilestoneKeys = [],
}: {
  label: string;
  id: string;
  data: ProgressData;
  achievements: Achievement[];
  promises: PromisesKeptStats;
  narrativeSummary: string;
  victoryMoment: VictoryMoment;
  newlyEarnedMilestoneKeys?: string[];
}) {
  return (
    <section id={id} className="border-t border-white/[0.06] pt-12 first:border-t-0 first:pt-0">
      <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-8">{label}</p>
      <ProgressContent
        data={data}
        achievements={achievements}
        narrativeSummary={narrativeSummary}
        promises={promises}
        victoryMoment={victoryMoment}
        newlyEarnedMilestoneKeys={newlyEarnedMilestoneKeys}
      />
    </section>
  );
}

export default function DevPreviewProgressPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0c] px-6 py-12 max-w-2xl mx-auto space-y-24">
      <StateSection
        id="state-1"
        label="State 1 — Perfect adherence week · ON PACE · Coach voice"
        data={perfectData}
        achievements={perfectAchievements}
        promises={perfectPromises}
        narrativeSummary="You're making strong progress. Over the last 6 weeks you've completed 88% of your planned workouts, losing 6.6 lbs in the process."
        victoryMoment={perfectVictory}
      />
      <StateSection
        id="state-2"
        label="State 2 — Non-quantifiable goal (general health)"
        data={nonQuantData}
        achievements={perfectAchievements}
        promises={perfectPromises}
        narrativeSummary="Your consistency has been strong — 88% of sessions completed over the last 6 weeks. Physical results often lag behavioral change by several weeks — your body is catching up."
        victoryMoment={nonQuantVictory}
      />
      <StateSection
        id="state-3"
        label="State 3 — Newly earned milestone (animation plays once per account)"
        data={newMilestoneData}
        achievements={newMilestoneAchievements}
        promises={newMilestonePromises}
        narrativeSummary="You're building your consistency — 75% of sessions completed over the last 3 weeks. Each session is a deposit that compounds over time."
        victoryMoment={newMilestoneVictory}
        newlyEarnedMilestoneKeys={["b3"]}
      />
      <StateSection
        id="state-4"
        label="State 4 — Day 1"
        data={dayOneData}
        achievements={dayOneAchievements}
        promises={dayOnePromises}
        narrativeSummary="Your progress record is just getting started. Submit your first check-in to begin building the picture your coach will use to guide your program."
        victoryMoment={dayOneVictory}
      />
      <StateSection
        id="state-5"
        label="State 5 — Difficult week"
        data={difficultData}
        achievements={perfectAchievements}
        promises={{ ...perfectPromises, currentStreak: 1 }}
        narrativeSummary="You're building your consistency — 63% of sessions completed over the last 4 weeks. Each session is a deposit that compounds over time."
        victoryMoment={difficultVictory}
      />
    </div>
  );
}
