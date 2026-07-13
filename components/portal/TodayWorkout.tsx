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
// EMPTY STATE
// ─────────────────────────────────────────────────────────────

function EmptyState({ kind }: { kind: string }) {
  const messages: Record<string, { title: string; body: string }> = {
    rest_day: {
      title: "Rest Day",
      body: "Active recovery — prioritize sleep, mobility, and nutrition today.",
    },
    no_program: {
      title: "No Program Assigned",
      body: "Your coach will assign your training program once your onboarding is complete.",
    },
    program_complete: {
      title: "Program Complete",
      body: "You've completed this training program. Your coach will assign your next block soon.",
    },
    not_started: {
      title: "Program Starts Soon",
      body: "Your training program hasn't started yet. Check back on your start date.",
    },
  };

  const msg = messages[kind] ?? messages.no_program;

  return (
    <div className="border border-white/[0.06] bg-[#0d0e0f] p-6 text-center">
      <div className="w-8 h-8 border border-white/[0.1] rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-gray-600 text-sm">
          {kind === "rest_day" ? "○" : kind === "program_complete" ? "✓" : "·"}
        </span>
      </div>
      <p className="text-white text-sm font-semibold mb-1">{msg.title}</p>
      <p className="text-gray-600 text-xs leading-relaxed">{msg.body}</p>
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
    <div className="border border-white/[0.06] bg-[#0d0e0f]">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] mb-1">
              {data.programName} · Week {data.weekNumber} of {data.totalWeeks}
            </p>
            <h3 className="text-white text-lg font-bold tracking-wide">{data.workoutName}</h3>
          </div>
          {data.estimatedDurationMinutes && (
            <div className="shrink-0 text-right">
              <p className="text-[#C9A24D] text-lg font-bold">{data.estimatedDurationMinutes}</p>
              <p className="text-gray-600 text-[9px] uppercase tracking-[0.3em]">min</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-gray-600 text-[11px]">
          <span>{totalExercises} exercise{totalExercises !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{totalSets} total sets</span>
          {data.snapshot.sections.length > 0 && (
            <>
              <span>·</span>
              <span>{data.snapshot.sections.length} sections</span>
            </>
          )}
        </div>
      </div>

      {/* Section preview */}
      <div className="px-5 py-3 border-b border-white/[0.04]">
        <div className="space-y-1.5">
          {data.snapshot.sections.slice(0, 4).map((sec) => (
            <div key={sec.id} className="flex items-center gap-3">
              <span className="text-gray-700 text-[9px] uppercase tracking-[0.3em] w-20 shrink-0">
                {sec.name}
              </span>
              <span className="text-gray-600 text-[10px]">
                {sec.exercises.map((e) => e.exerciseName).join(", ")}
              </span>
            </div>
          ))}
          {data.snapshot.sections.length > 4 && (
            <p className="text-gray-700 text-[10px]">
              +{data.snapshot.sections.length - 4} more sections
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-5 py-4">
        {isCompleted ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 text-[9px]">✓</span>
            </div>
            <span className="text-emerald-400 text-xs font-semibold">Workout completed today</span>
          </div>
        ) : isInProgress && data.existingSessionId ? (
          <button
            onClick={() => onResumeWorkout(data.existingSessionId!)}
            className="w-full bg-[#C9A24D]/20 border border-[#C9A24D]/30 text-[#C9A24D] font-bold text-[10px] tracking-[0.35em] uppercase py-3.5 hover:bg-[#C9A24D]/30 transition-colors"
          >
            Resume Workout
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.35em] uppercase py-3.5 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
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
      <div className="border border-white/[0.06] bg-[#0d0e0f] p-6">
        <div className="h-4 bg-white/[0.04] animate-pulse mb-2 w-1/3" />
        <div className="h-6 bg-white/[0.04] animate-pulse mb-4 w-2/3" />
        <div className="h-12 bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (!result || result.kind !== "workout") {
    return <EmptyState kind={result?.kind ?? "no_program"} />;
  }

  const todayData = result.data;

  if (view === "active_session" && activeSessionId) {
    return (
      <div className="border border-white/[0.06] bg-[#0d0e0f]">
        <WorkoutSession
          sessionId={activeSessionId}
          snapshot={todayData.snapshot}
          programWeekNumber={todayData.weekNumber}
          scheduledDate={todayData.scheduledDate}
          onComplete={(pct) => {
            setCompletionPct(pct);
            setView("completed");
          }}
          onCancel={() => setView("today")}
        />
      </div>
    );
  }

  if (view === "completed") {
    return (
      <div className="border border-white/[0.06] bg-[#0d0e0f] p-6 text-center">
        <div className="w-10 h-10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-500/10">
          <span className="text-emerald-400 text-base">✓</span>
        </div>
        <h3 className="text-white text-lg font-bold mb-1">Workout Complete</h3>
        <p className="text-gray-600 text-sm mb-1">{todayData.workoutName}</p>
        {completionPct !== null && (
          <p className="text-[#C9A24D] font-bold text-2xl mb-4">{completionPct}%</p>
        )}
        <p className="text-gray-700 text-xs">
          Your session has been recorded. Rest up and recover strong.
        </p>
      </div>
    );
  }

  // Default: workout card
  return (
    <WorkoutCard
      data={todayData}
      onStartWorkout={() => {
        // Re-fetch session (it was created in WorkoutCard.handleStart)
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
