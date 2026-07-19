"use client";

import { useState, useEffect } from "react";
import WorkoutSession from "./WorkoutSession";
import type { WorkoutSnapshot } from "./WorkoutSession";

// ─────────────────────────────────────────────────────────────
// API TYPES
// ─────────────────────────────────────────────────────────────

interface TodayWorkoutData {
  clientProgramId: string;
  programName: string;
  weekNumber: number;
  dayOfWeek: number;
  totalWeeks: number;
  workoutTemplateId: string;
  workoutName: string;
  estimatedDurationMinutes: number | null;
  scheduledDate: string;
  existingSessionId: string | null;
  existingSessionStatus: string | null;
  snapshot: WorkoutSnapshot;
}

type TodayResult =
  | { kind: "workout"; data: TodayWorkoutData }
  | { kind: "rest_day" }
  | { kind: "no_program" }
  | { kind: "program_complete" }
  | { kind: "not_started" };

type View = "today" | "active_session" | "completed";

// ─────────────────────────────────────────────────────────────
// EMPTY STATES
// ─────────────────────────────────────────────────────────────

function EmptyState({ kind }: { kind: string }) {
  const messages: Record<string, { title: string; body: string }> = {
    rest_day: {
      title: "Rest Day",
      body: "Active recovery — protect your sleep, hit your protein targets, and move lightly. The adaptation happens now.",
    },
    no_program: {
      title: "No Program Assigned",
      body: "Your coach will assign your training program once your onboarding is complete. Use this time to build your foundation habits.",
    },
    program_complete: {
      title: "Program Complete",
      body: "Every session logged, every promise kept. Your coach will assign your next training block soon.",
    },
    not_started: {
      title: "Program Starts Soon",
      body: "Your training block hasn't started yet. Prepare your environment, dial in sleep and nutrition, and show up ready.",
    },
  };

  const msg = messages[kind] ?? messages.no_program;

  const icon =
    kind === "rest_day" ? "○" :
    kind === "program_complete" ? "✓" :
    kind === "not_started" ? "◷" : "·";

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f] px-6 py-7">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 border border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-gray-400 text-sm">{icon}</span>
        </div>
        <div>
          <p className="text-white text-sm font-semibold mb-1">{msg.title}</p>
          <p className="text-gray-400 text-xs leading-relaxed">{msg.body}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WORKOUT PREVIEW CARD
// ─────────────────────────────────────────────────────────────

function WorkoutCard({
  data,
  onStartWorkout,
  onResumeWorkout,
}: {
  data: TodayWorkoutData;
  onStartWorkout: () => void;
  onResumeWorkout: (sessionId: string) => void;
}) {
  const [starting, setStarting] = useState(false);

  const allExercises = [
    ...data.snapshot.sections.flatMap((s) => s.exercises),
    ...data.snapshot.unsectioned,
  ];
  const totalSets = allExercises.reduce((s, ex) => s + (ex.sets ?? 1), 0);
  const totalExercises = allExercises.length;

  const isCompleted = data.existingSessionStatus === "completed";
  const isInProgress = data.existingSessionStatus === "in_progress";

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/portal/workout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientProgramId: data.clientProgramId,
          workoutTemplateId: data.workoutTemplateId,
          programWeekNumber: data.weekNumber,
          programDayOfWeek: data.dayOfWeek,
          scheduledDate: data.scheduledDate,
        }),
      });
      const res2 = await res.json() as { ok: boolean; session?: { id: string } };
      if (res2.ok && res2.session) {
        onStartWorkout();
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="border border-white/[0.08] bg-[#0d0e0f] relative overflow-hidden">
      {/* Subtle top accent on the primary card */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#c9a24d]/20 to-transparent" aria-hidden />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-1">
              {data.programName} · Week {data.weekNumber}/{data.totalWeeks}
            </p>
            <h3 className="text-white text-lg font-bold tracking-wide leading-snug">
              {data.workoutName}
            </h3>
          </div>
          {data.estimatedDurationMinutes && (
            <div className="shrink-0 text-right">
              <p className="text-[#C9A24D] text-xl font-bold tabular-nums leading-none">
                {data.estimatedDurationMinutes}
              </p>
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.3em] mt-0.5">min</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2.5 text-gray-500 text-[10px]">
          <span>{totalExercises} exercise{totalExercises !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{totalSets} sets</span>
          {data.snapshot.sections.length > 0 && (
            <>
              <span>·</span>
              <span>{data.snapshot.sections.length} blocks</span>
            </>
          )}
        </div>
      </div>

      {/* Exercise preview */}
      <div className="px-5 py-3 border-b border-white/[0.04] space-y-1.5">
        {data.snapshot.sections.slice(0, 4).map((sec) => (
          <div key={sec.id} className="flex items-start gap-3">
            <span className="text-gray-600 text-[9px] uppercase tracking-[0.3em] w-20 shrink-0 pt-px">
              {sec.name}
            </span>
            <span className="text-gray-400 text-[10px] leading-relaxed">
              {sec.exercises.map((e) => e.exerciseName).join(", ")}
            </span>
          </div>
        ))}
        {data.snapshot.unsectioned.length > 0 && data.snapshot.sections.length === 0 && (
          <div className="flex items-start gap-3">
            <span className="text-gray-600 text-[9px] uppercase tracking-[0.3em] w-20 shrink-0 pt-px">
              Exercises
            </span>
            <span className="text-gray-400 text-[10px] leading-relaxed">
              {data.snapshot.unsectioned.map((e) => e.exerciseName).join(", ")}
            </span>
          </div>
        )}
        {data.snapshot.sections.length > 4 && (
          <p className="text-gray-600 text-[10px]">
            +{data.snapshot.sections.length - 4} more blocks
          </p>
        )}
      </div>

      {/* Action */}
      <div className="px-5 py-4">
        {isCompleted ? (
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 text-[9px]">✓</span>
            </div>
            <span className="text-emerald-400 text-xs font-semibold tracking-wide">
              Promise kept — session logged
            </span>
          </div>
        ) : isInProgress && data.existingSessionId ? (
          <button
            onClick={() => onResumeWorkout(data.existingSessionId!)}
            className="w-full bg-[#C9A24D]/15 border border-[#C9A24D]/25 text-[#C9A24D] font-bold text-[10px] tracking-[0.3em] uppercase py-3.5 hover:bg-[#C9A24D]/25 transition-colors"
          >
            Resume Workout
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-[#C9A24D] text-black font-bold text-[11px] tracking-[0.3em] uppercase py-3.5 hover:bg-[#d4af63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {starting ? "Starting…" : "Start Workout"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN TODAY WORKOUT COMPONENT
// ─────────────────────────────────────────────────────────────

export default function TodayWorkout() {
  const [result, setResult] = useState<TodayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("today");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [completionPct, setCompletionPct] = useState<number | null>(null);
  const [workoutName, setWorkoutName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/portal/today-workout")
      .then((r) => r.json())
      .then((data: { ok: boolean; result?: TodayResult }) => {
        if (!mounted) return;
        if (data.ok && data.result) setResult(data.result);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f]">
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="h-2 bg-white/[0.05] animate-pulse w-2/5 mb-3 rounded-sm" />
              <div className="h-5 bg-white/[0.07] animate-pulse w-3/4 mb-3 rounded-sm" />
              <div className="flex gap-3">
                <div className="h-2 bg-white/[0.04] animate-pulse w-20 rounded-sm" />
                <div className="h-2 bg-white/[0.04] animate-pulse w-16 rounded-sm" />
              </div>
            </div>
            <div className="h-9 w-10 bg-white/[0.04] animate-pulse shrink-0 rounded-sm" />
          </div>
        </div>
        <div className="px-5 py-3 border-b border-white/[0.04] space-y-2.5">
          {([55, 75, 45] as const).map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2 bg-white/[0.04] animate-pulse w-16 shrink-0 rounded-sm" />
              <div className="h-2 bg-white/[0.04] animate-pulse flex-1 rounded-sm" style={{ maxWidth: `${w}%` }} />
            </div>
          ))}
        </div>
        <div className="px-5 py-4">
          <div className="h-12 bg-white/[0.04] animate-pulse rounded-sm" />
        </div>
      </div>
    );
  }

  if (!result || result.kind !== "workout") {
    return <EmptyState kind={result?.kind ?? "no_program"} />;
  }

  const todayData = result.data;

  if (view === "active_session" && activeSessionId) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f]">
        <WorkoutSession
          sessionId={activeSessionId}
          snapshot={todayData.snapshot}
          programWeekNumber={todayData.weekNumber}
          scheduledDate={todayData.scheduledDate}
          onComplete={(pct) => {
            setCompletionPct(pct);
            setWorkoutName(todayData.workoutName);
            setView("completed");
          }}
          onCancel={() => setView("today")}
        />
      </div>
    );
  }

  if (view === "completed") {
    return (
      <div className="border border-emerald-500/15 bg-emerald-500/[0.03] px-6 py-8 text-center">
        <div className="w-10 h-10 border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-emerald-400 text-base">✓</span>
        </div>
        <h3 className="text-white text-base font-bold tracking-wide mb-0.5">
          Promise Kept
        </h3>
        <p className="text-gray-500 text-sm mb-3">
          {workoutName ?? todayData.workoutName}
        </p>
        {completionPct !== null && (
          <p className="text-[#C9A24D] font-bold text-2xl tabular-nums mb-3">
            {completionPct}%
          </p>
        )}
        <p className="text-gray-600 text-xs max-w-xs mx-auto leading-relaxed">
          Session recorded. Rest up, hit your targets, and come back stronger.
        </p>
      </div>
    );
  }

  return (
    <WorkoutCard
      data={todayData}
      onStartWorkout={() => {
        fetch("/api/portal/today-workout")
          .then((r) => r.json())
          .then((d: { ok: boolean; result?: TodayResult }) => {
            if (d.ok && d.result?.kind === "workout") {
              const sid = d.result.data.existingSessionId;
              if (sid) {
                setActiveSessionId(sid);
                setView("active_session");
              }
            }
          });
      }}
      onResumeWorkout={(sessionId) => {
        setActiveSessionId(sessionId);
        setView("active_session");
      }}
    />
  );
}
