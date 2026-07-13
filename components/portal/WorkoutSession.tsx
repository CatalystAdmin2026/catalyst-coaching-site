"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// TYPES (match WorkoutSnapshot from client-program-service)
// ─────────────────────────────────────────────────────────────

interface ExerciseItem {
  id: string; // workout_template_exercise id
  exerciseName: string;
  orderIndex: number;
  groupId: string | null;
  groupPosition: number | null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  targetRpe: string | null;
  targetRir: string | null;
  setTechnique: string | null;
  coachNotes: string | null;
}

interface SectionItem {
  id: string;
  name: string;
  sectionType: string;
  orderIndex: number;
  estimatedMinutes: number | null;
  exercises: ExerciseItem[];
}

export interface WorkoutSnapshot {
  templateId: string;
  templateName: string;
  estimatedDurationMinutes: number | null;
  sections: SectionItem[];
  unsectioned: ExerciseItem[];
}

export interface Props {
  sessionId: string;
  snapshot: WorkoutSnapshot;
  programWeekNumber: number | null;
  scheduledDate: string | null;
  onComplete: (pct: number) => void;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function repRange(ex: ExerciseItem): string {
  if (ex.durationSeconds) return `${ex.durationSeconds}s`;
  if (ex.repsMin && ex.repsMax && ex.repsMin !== ex.repsMax) return `${ex.repsMin}–${ex.repsMax}`;
  if (ex.repsMin) return `${ex.repsMin}`;
  if (ex.repsMax) return `${ex.repsMax}`;
  return "—";
}

const TECHNIQUE_COLORS: Record<string, string> = {
  superset: "text-violet-400",
  triset: "text-cyan-400",
  giant_set: "text-pink-400",
  drop_set: "text-orange-400",
  rest_pause: "text-lime-400",
  stretch_mediated_finisher: "text-sky-400",
  lengthened_partials: "text-amber-400",
};

// ─────────────────────────────────────────────────────────────
// EXERCISE ROW
// ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  completedSets,
  onSetComplete,
  onSetUndo,
}: {
  exercise: ExerciseItem;
  completedSets: Set<number>;
  onSetComplete: (exerciseId: string, setNum: number) => void;
  onSetUndo: (exerciseId: string, setNum: number) => void;
}) {
  const totalSets = exercise.sets ?? 1;
  const techniqueClass = exercise.setTechnique
    ? TECHNIQUE_COLORS[exercise.setTechnique] ?? "text-gray-500"
    : "";

  return (
    <div className="border border-white/[0.05] bg-[#0a0b0c] mb-2">
      {/* Exercise header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white text-sm font-semibold leading-tight">
              {exercise.exerciseName}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {exercise.setTechnique && exercise.setTechnique !== "straight_set" && (
                <span className={`text-[10px] font-semibold ${techniqueClass}`}>
                  {fmtLabel(exercise.setTechnique)}
                </span>
              )}
              {exercise.tempo && (
                <span className="text-[10px] text-gray-600 font-mono">{exercise.tempo}</span>
              )}
              {exercise.restSeconds && (
                <span className="text-[10px] text-gray-600">{exercise.restSeconds}s rest</span>
              )}
              {exercise.targetRpe && (
                <span className="text-[10px] text-gray-600">RPE {exercise.targetRpe}</span>
              )}
              {exercise.targetRir && (
                <span className="text-[10px] text-gray-600">{exercise.targetRir} RIR</span>
              )}
            </div>
            {exercise.coachNotes && (
              <p className="text-gray-600 text-[11px] italic mt-1.5 leading-relaxed">
                {exercise.coachNotes}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[#C9A24D] font-bold text-base leading-tight">
              {totalSets}×{repRange(exercise)}
            </p>
          </div>
        </div>
      </div>

      {/* Set buttons */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
          const done = completedSets.has(setNum);
          return (
            <button
              key={setNum}
              onClick={() => done ? onSetUndo(exercise.id, setNum) : onSetComplete(exercise.id, setNum)}
              className={`min-w-[44px] px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-all border ${
                done
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-[#080909] border-white/[0.08] text-gray-600 hover:border-white/20 hover:text-gray-400"
              }`}
            >
              {done ? "✓" : `Set ${setNum}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION BLOCK
// ─────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  completedMap,
  onSetComplete,
  onSetUndo,
}: {
  section: SectionItem;
  completedMap: Map<string, Set<number>>;
  onSetComplete: (exerciseId: string, setNum: number) => void;
  onSetUndo: (exerciseId: string, setNum: number) => void;
}) {
  const sortedExercises = [...section.exercises].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-semibold">
          {section.name}
        </p>
        {section.estimatedMinutes && (
          <span className="text-gray-700 text-[10px]">{section.estimatedMinutes} min</span>
        )}
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>
      {sortedExercises.map((ex) => (
        <ExerciseRow
          key={ex.id}
          exercise={ex}
          completedSets={completedMap.get(ex.id) ?? new Set()}
          onSetComplete={onSetComplete}
          onSetUndo={onSetUndo}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WORKOUT SESSION
// ─────────────────────────────────────────────────────────────

export default function WorkoutSession({
  sessionId,
  snapshot,
  programWeekNumber,
  scheduledDate,
  onComplete,
  onCancel,
}: Props) {
  // Map: exerciseId → Set of completed set numbers
  const [completedMap, setCompletedMap] = useState<Map<string, Set<number>>>(
    new Map(),
  );
  const [finishing, setFinishing] = useState(false);
  const [savingSet, setSavingSet] = useState(false);

  // Count total sets across the whole workout
  const allExercises = [
    ...snapshot.sections.flatMap((s) => s.exercises),
    ...snapshot.unsectioned,
  ];
  const totalSets = allExercises.reduce((s, ex) => s + (ex.sets ?? 1), 0);
  const doneSets = [...completedMap.values()].reduce(
    (s, set) => s + set.size,
    0,
  );
  const pct = totalSets > 0 ? Math.min(100, Math.round((doneSets / totalSets) * 100)) : 0;

  async function handleSetComplete(exerciseId: string, setNum: number) {
    setSavingSet(true);
    try {
      await fetch(`/api/portal/workout-session/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutTemplateExerciseId: exerciseId,
          setNumber: setNum,
        }),
      });
      setCompletedMap((prev) => {
        const next = new Map(prev);
        const s = new Set(next.get(exerciseId) ?? []);
        s.add(setNum);
        next.set(exerciseId, s);
        return next;
      });
    } finally {
      setSavingSet(false);
    }
  }

  async function handleSetUndo(exerciseId: string, setNum: number) {
    setSavingSet(true);
    try {
      await fetch(`/api/portal/workout-session/${sessionId}/sets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutTemplateExerciseId: exerciseId,
          setNumber: setNum,
        }),
      });
      setCompletedMap((prev) => {
        const next = new Map(prev);
        const s = new Set(next.get(exerciseId) ?? []);
        s.delete(setNum);
        next.set(exerciseId, s);
        return next;
      });
    } finally {
      setSavingSet(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await fetch(`/api/portal/workout-session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      onComplete(pct);
    } finally {
      setFinishing(false);
    }
  }

  const sortedSections = [...snapshot.sections].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const sortedUnsectioned = [...snapshot.unsectioned].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Workout header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] mb-1">
              {programWeekNumber ? `Week ${programWeekNumber}` : "Today's Workout"}
              {scheduledDate && ` · ${new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
            </p>
            <h2 className="text-white text-xl font-bold tracking-wide">
              {snapshot.templateName}
            </h2>
            {snapshot.estimatedDurationMinutes && (
              <p className="text-gray-600 text-xs mt-1">~{snapshot.estimatedDurationMinutes} min</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-700 text-[10px] hover:text-gray-400 transition-colors uppercase tracking-widest shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">Progress</span>
            <span className="text-[10px] text-[#C9A24D] font-bold">{pct}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A24D] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-700 text-[10px] mt-1">{doneSets} / {totalSets} sets complete</p>
        </div>
      </div>

      {/* Sections */}
      {sortedSections.map((sec) => (
        <SectionBlock
          key={sec.id}
          section={sec}
          completedMap={completedMap}
          onSetComplete={handleSetComplete}
          onSetUndo={handleSetUndo}
        />
      ))}

      {/* Unsectioned */}
      {sortedUnsectioned.length > 0 && (
        <div className="mb-5">
          {sortedUnsectioned.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              completedSets={completedMap.get(ex.id) ?? new Set()}
              onSetComplete={handleSetComplete}
              onSetUndo={handleSetUndo}
            />
          ))}
        </div>
      )}

      {/* Finish button */}
      <div className="mt-8 border-t border-white/[0.06] pt-6 flex gap-3 items-center">
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="flex-1 bg-[#C9A24D] text-black font-bold text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
        >
          {finishing ? "Saving…" : `Finish Workout${pct > 0 ? ` — ${pct}%` : ""}`}
        </button>
        {savingSet && (
          <div className="w-4 h-4 border-2 border-[#C9A24D]/30 border-t-[#C9A24D] rounded-full animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
}
