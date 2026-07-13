"use client";

import { useState } from "react";
import { lbsToKg } from "@/lib/portal/units";

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
// PER-SET STATE
// ─────────────────────────────────────────────────────────────

type SetStatus = "idle" | "pending" | "done" | "editing" | "error";

interface SetData {
  status: SetStatus;
  // Input values (controlled strings for number inputs)
  weightLbs: string;
  reps: string;
  duration: string; // seconds
  rpe: string;
  // Logged values shown in "done" state
  loggedWeightLbs: number | null;
  loggedReps: number | null;
  loggedDuration: number | null;
  loggedRpe: number | null;
  errorMsg: string;
}

const DEFAULT_SET: SetData = {
  status: "idle",
  weightLbs: "",
  reps: "",
  duration: "",
  rpe: "",
  loggedWeightLbs: null,
  loggedReps: null,
  loggedDuration: null,
  loggedRpe: null,
  errorMsg: "",
};

function sKey(exerciseId: string, setNum: number) {
  return `${exerciseId}::${setNum}`;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function repRange(ex: ExerciseItem): string {
  if (ex.durationSeconds) return `${ex.durationSeconds}s`;
  if (ex.repsMin && ex.repsMax && ex.repsMin !== ex.repsMax)
    return `${ex.repsMin}–${ex.repsMax}`;
  if (ex.repsMin) return `${ex.repsMin}`;
  if (ex.repsMax) return `${ex.repsMax}`;
  return "—";
}

function validateSetData(data: SetData): string | null {
  const weight = data.weightLbs ? parseFloat(data.weightLbs) : null;
  const reps = data.reps ? parseInt(data.reps, 10) : null;
  const duration = data.duration ? parseInt(data.duration, 10) : null;
  const rpe = data.rpe ? parseFloat(data.rpe) : null;

  if (weight !== null && weight < 0) return "Weight cannot be negative";
  if (reps !== null && reps < 0) return "Reps cannot be negative";
  if (duration !== null && duration < 0) return "Duration cannot be negative";
  if (rpe !== null && (rpe < 0 || rpe > 10)) return "RPE must be 0–10";
  return null;
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
// NUM INPUT
// ─────────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  width,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number | string;
  width: string;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${width} bg-[#080909] border border-white/[0.08] text-white text-[11px] px-2 py-1.5 text-center focus:outline-none focus:border-[#C9A24D]/40 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// SET ROW
// ─────────────────────────────────────────────────────────────

function SetRow({
  setNum,
  isTimeBased,
  data,
  onUpdate,
  onLog,
  onCorrect,
}: {
  setNum: number;
  isTimeBased: boolean;
  data: SetData;
  onUpdate: (patch: Partial<SetData>) => void;
  onLog: () => void;
  onCorrect: () => void;
}) {
  const isPending = data.status === "pending";

  if (data.status === "done") {
    const parts: string[] = [];
    if (data.loggedWeightLbs !== null) parts.push(`${data.loggedWeightLbs} lb`);
    if (data.loggedReps !== null) parts.push(`${data.loggedReps} reps`);
    if (data.loggedDuration !== null) parts.push(`${data.loggedDuration}s`);
    if (data.loggedRpe !== null) parts.push(`RPE ${data.loggedRpe}`);

    return (
      <div className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-b-0">
        <span className="text-[10px] text-gray-700 w-12 shrink-0 font-mono">Set {setNum}</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500/50 shrink-0" />
        <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.1em]">
          Promise Kept
        </span>
        {parts.length > 0 && (
          <span className="text-gray-600 text-[10px] hidden sm:block">{parts.join(" · ")}</span>
        )}
        <button
          onClick={onCorrect}
          className="ml-auto text-gray-700 text-[10px] hover:text-gray-400 transition-colors shrink-0"
        >
          Correct
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-white/[0.03] last:border-b-0 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-700 w-12 shrink-0 font-mono">
          {data.status === "editing" ? `✎ ${setNum}` : `Set ${setNum}`}
        </span>

        {!isTimeBased && (
          <>
            <div className="flex items-center gap-1">
              <NumInput
                value={data.weightLbs}
                onChange={(v) => onUpdate({ weightLbs: v, status: "idle", errorMsg: "" })}
                placeholder="—"
                min={0}
                step={0.5}
                width="w-16"
                disabled={isPending}
                ariaLabel="Weight in pounds"
              />
              <span className="text-gray-600 text-[10px] shrink-0">lb</span>
            </div>

            <div className="flex items-center gap-1">
              <NumInput
                value={data.reps}
                onChange={(v) => onUpdate({ reps: v, status: "idle", errorMsg: "" })}
                placeholder="—"
                min={0}
                step={1}
                width="w-12"
                disabled={isPending}
                ariaLabel="Reps completed"
              />
              <span className="text-gray-600 text-[10px] shrink-0">reps</span>
            </div>
          </>
        )}

        {isTimeBased && (
          <div className="flex items-center gap-1">
            <NumInput
              value={data.duration}
              onChange={(v) => onUpdate({ duration: v, status: "idle", errorMsg: "" })}
              placeholder="—"
              min={0}
              step={1}
              width="w-16"
              disabled={isPending}
              ariaLabel="Duration in seconds"
            />
            <span className="text-gray-600 text-[10px] shrink-0">sec</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <NumInput
            value={data.rpe}
            onChange={(v) => onUpdate({ rpe: v, status: "idle", errorMsg: "" })}
            placeholder="RPE"
            min={0}
            max={10}
            step={0.5}
            width="w-14"
            disabled={isPending}
            ariaLabel="RPE (rate of perceived exertion, 0–10)"
          />
        </div>

        <button
          onClick={onLog}
          disabled={isPending}
          className="bg-[#C9A24D]/10 border border-[#C9A24D]/20 text-[#C9A24D] text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-[#C9A24D]/20 transition-colors disabled:opacity-50 shrink-0"
        >
          {isPending ? "…" : "Log"}
        </button>
      </div>

      {data.errorMsg && (
        <p className="text-red-400 text-[10px] mt-1 pl-14">{data.errorMsg}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE ROW
// ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  setStates,
  onUpdate,
  onLog,
  onCorrect,
}: {
  exercise: ExerciseItem;
  setStates: Map<string, SetData>;
  onUpdate: (exerciseId: string, setNum: number, patch: Partial<SetData>) => void;
  onLog: (exerciseId: string, setNum: number) => void;
  onCorrect: (exerciseId: string, setNum: number) => void;
}) {
  const totalSets = exercise.sets ?? 1;
  const isTimeBased = exercise.durationSeconds != null;
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
                <span className="text-[10px] text-gray-600">Target RPE {exercise.targetRpe}</span>
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

      {/* Set rows */}
      <div className="px-4 pb-3">
        {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => (
          <SetRow
            key={setNum}
            setNum={setNum}
            isTimeBased={isTimeBased}
            data={setStates.get(sKey(exercise.id, setNum)) ?? DEFAULT_SET}
            onUpdate={(patch) => onUpdate(exercise.id, setNum, patch)}
            onLog={() => onLog(exercise.id, setNum)}
            onCorrect={() => onCorrect(exercise.id, setNum)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION BLOCK
// ─────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  setStates,
  onUpdate,
  onLog,
  onCorrect,
}: {
  section: SectionItem;
  setStates: Map<string, SetData>;
  onUpdate: (exerciseId: string, setNum: number, patch: Partial<SetData>) => void;
  onLog: (exerciseId: string, setNum: number) => void;
  onCorrect: (exerciseId: string, setNum: number) => void;
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
          setStates={setStates}
          onUpdate={onUpdate}
          onLog={onLog}
          onCorrect={onCorrect}
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
  const [setStates, setSetStates] = useState<Map<string, SetData>>(new Map());
  const [finishing, setFinishing] = useState(false);

  const allExercises = [
    ...snapshot.sections.flatMap((s) => s.exercises),
    ...snapshot.unsectioned,
  ];
  const totalSets = allExercises.reduce((s, ex) => s + (ex.sets ?? 1), 0);
  const doneSets = [...setStates.values()].filter((d) => d.status === "done").length;
  const pct = totalSets > 0 ? Math.min(100, Math.round((doneSets / totalSets) * 100)) : 0;

  function updateSetState(exerciseId: string, setNum: number, patch: Partial<SetData>) {
    const key = sKey(exerciseId, setNum);
    setSetStates((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(prev.get(key) ?? DEFAULT_SET), ...patch });
      return next;
    });
  }

  async function handleLog(exerciseId: string, setNum: number) {
    const data = setStates.get(sKey(exerciseId, setNum)) ?? DEFAULT_SET;

    const err = validateSetData(data);
    if (err) {
      updateSetState(exerciseId, setNum, { status: "error", errorMsg: err });
      return;
    }

    const weightNum = data.weightLbs ? parseFloat(data.weightLbs) : null;
    const repsNum = data.reps ? parseInt(data.reps, 10) : null;
    const durationNum = data.duration ? parseInt(data.duration, 10) : null;
    const rpeNum = data.rpe ? parseFloat(data.rpe) : null;

    updateSetState(exerciseId, setNum, { status: "pending", errorMsg: "" });

    try {
      const res = await fetch(`/api/portal/workout-session/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutTemplateExerciseId: exerciseId,
          setNumber: setNum,
          actualReps: repsNum,
          actualWeightKg: weightNum !== null ? lbsToKg(weightNum).toFixed(4) : null,
          actualDurationSeconds: durationNum,
          actualRpe: rpeNum !== null ? String(rpeNum) : null,
        }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };

      if (!json.ok) {
        updateSetState(exerciseId, setNum, {
          status: "error",
          errorMsg: json.error ?? "Failed to log set — try again",
        });
        return;
      }

      updateSetState(exerciseId, setNum, {
        status: "done",
        loggedWeightLbs: weightNum,
        loggedReps: repsNum,
        loggedDuration: durationNum,
        loggedRpe: rpeNum,
        errorMsg: "",
      });
    } catch {
      updateSetState(exerciseId, setNum, {
        status: "error",
        errorMsg: "Network error — try again",
      });
    }
  }

  function handleCorrect(exerciseId: string, setNum: number) {
    const data = setStates.get(sKey(exerciseId, setNum)) ?? DEFAULT_SET;
    updateSetState(exerciseId, setNum, {
      status: "editing",
      weightLbs: data.loggedWeightLbs !== null ? String(data.loggedWeightLbs) : "",
      reps: data.loggedReps !== null ? String(data.loggedReps) : "",
      duration: data.loggedDuration !== null ? String(data.loggedDuration) : "",
      rpe: data.loggedRpe !== null ? String(data.loggedRpe) : "",
      errorMsg: "",
    });
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

  const sortedSections = [...snapshot.sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedUnsectioned = [...snapshot.unsectioned].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Workout header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] mb-1">
              {programWeekNumber ? `Week ${programWeekNumber}` : "Today's Workout"}
              {scheduledDate &&
                ` · ${new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
            </p>
            <h2 className="text-white text-xl font-bold tracking-wide">
              {snapshot.templateName}
            </h2>
            {snapshot.estimatedDurationMinutes && (
              <p className="text-gray-600 text-xs mt-1">
                ~{snapshot.estimatedDurationMinutes} min
              </p>
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
          <p className="text-gray-700 text-[10px] mt-1">
            {doneSets} / {totalSets} sets logged
          </p>
        </div>
      </div>

      {/* Legend */}
      {totalSets > 0 && (
        <div className="flex items-center gap-4 mb-4 text-[10px] text-gray-700">
          <span>Weight · Reps · RPE are optional — log what you tracked.</span>
        </div>
      )}

      {/* Sections */}
      {sortedSections.map((sec) => (
        <SectionBlock
          key={sec.id}
          section={sec}
          setStates={setStates}
          onUpdate={updateSetState}
          onLog={handleLog}
          onCorrect={handleCorrect}
        />
      ))}

      {/* Unsectioned */}
      {sortedUnsectioned.length > 0 && (
        <div className="mb-5">
          {sortedUnsectioned.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              setStates={setStates}
              onUpdate={updateSetState}
              onLog={handleLog}
              onCorrect={handleCorrect}
            />
          ))}
        </div>
      )}

      {/* Finish button */}
      <div className="mt-8 border-t border-white/[0.06] pt-6">
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="w-full bg-[#C9A24D] text-black font-bold text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
        >
          {finishing ? "Saving…" : `Finish Workout${pct > 0 ? ` — ${pct}%` : ""}`}
        </button>
      </div>
    </div>
  );
}
