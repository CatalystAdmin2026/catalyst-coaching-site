// ─────────────────────────────────────────────────────────────
// Catalyst OS — Historical Session Detail
//
// Server component — auth and DB queries run server-side.
// Protected by app/portal/layout.tsx (requireClientUser + role check).
//
// Ownership: getHistoricalSessionDetail filters by clientId so a client
// cannot read another client's session. Returns null → 404 (non-disclosing).
// ─────────────────────────────────────────────────────────────

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireClientUser } from "@/lib/supabase/session";
import {
  getHistoricalSessionDetail,
  type HistoricalSetLog,
} from "@/lib/db/workout-session-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// SNAPSHOT TYPES
// ─────────────────────────────────────────────────────────────

interface SnapshotExercise {
  id: string;
  exerciseName: string;
  orderIndex: number;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tempo: string | null;
  targetRpe: string | null;
  targetRir: string | null;
  coachNotes: string | null;
}

interface SnapshotSection {
  id: string;
  name: string;
  orderIndex: number;
  estimatedMinutes: number | null;
  exercises: SnapshotExercise[];
}

interface ParsedSnapshot {
  templateName: string;
  estimatedDurationMinutes: number | null;
  sections: SnapshotSection[];
  unsectioned: SnapshotExercise[];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function parseSnapshot(raw: Record<string, unknown> | null): ParsedSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  if (!Array.isArray(raw.sections)) return null;
  return raw as unknown as ParsedSnapshot;
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d instanceof Date ? d : d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function repRange(ex: SnapshotExercise): string {
  if (ex.durationSeconds) return `${ex.durationSeconds}s`;
  if (ex.repsMin && ex.repsMax && ex.repsMin !== ex.repsMax)
    return `${ex.repsMin}–${ex.repsMax}`;
  if (ex.repsMin) return `${ex.repsMin}`;
  if (ex.repsMax) return `${ex.repsMax}`;
  return "—";
}

function statusBadge(status: string) {
  if (status === "completed")
    return <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-[0.15em]">Completed</span>;
  if (status === "skipped")
    return <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Skipped</span>;
  return <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-[0.15em]">{status}</span>;
}

// ─────────────────────────────────────────────────────────────
// EXERCISE BLOCK
// ─────────────────────────────────────────────────────────────

function ExerciseBlock({
  exercise,
  logs,
}: {
  exercise: SnapshotExercise;
  logs: HistoricalSetLog[];
}) {
  const totalSets = exercise.sets ?? 1;

  return (
    <div className="border border-white/[0.05] bg-[#0a0b0c] mb-2">
      {/* Exercise header */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold leading-tight">
              {exercise.exerciseName}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {exercise.tempo && (
                <span className="text-gray-400 text-[10px] font-mono">{exercise.tempo}</span>
              )}
              {exercise.restSeconds && (
                <span className="text-gray-400 text-[10px]">{exercise.restSeconds}s rest</span>
              )}
              {exercise.targetRpe && (
                <span className="text-gray-400 text-[10px]">Target RPE {exercise.targetRpe}</span>
              )}
              {exercise.targetRir && (
                <span className="text-gray-400 text-[10px]">{exercise.targetRir} RIR</span>
              )}
            </div>
            {exercise.coachNotes && (
              <p className="text-gray-400 text-[11px] italic mt-1.5 leading-relaxed">
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

      {/* Set performance rows */}
      <div className="px-4 py-2">
        {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
          const log = logs.find((l) => l.setNumber === setNum) ?? null;
          return (
            <SetRow key={setNum} setNum={setNum} log={log} isTimeBased={!!exercise.durationSeconds} />
          );
        })}
      </div>
    </div>
  );
}

function SetRow({
  setNum,
  log,
  isTimeBased,
}: {
  setNum: number;
  log: HistoricalSetLog | null;
  isTimeBased: boolean;
}) {
  if (!log) {
    return (
      <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-b-0">
        <span className="text-[10px] text-gray-500 w-12 shrink-0 font-mono">Set {setNum}</span>
        <span className="text-gray-500 text-[10px] italic">not logged</span>
      </div>
    );
  }

  const parts: string[] = [];
  if (!isTimeBased && log.actualWeightLbs !== null) parts.push(`${log.actualWeightLbs} lb`);
  if (!isTimeBased && log.actualReps !== null) parts.push(`${log.actualReps} reps`);
  if (isTimeBased && log.actualDurationSeconds !== null) parts.push(`${log.actualDurationSeconds}s`);
  if (log.actualRpe !== null) parts.push(`RPE ${log.actualRpe}`);

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-b-0">
      <span className="text-[10px] text-gray-500 w-12 shrink-0 font-mono">Set {setNum}</span>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
      {parts.length > 0 ? (
        <span className="text-white text-[11px] font-medium">{parts.join(" · ")}</span>
      ) : (
        <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.1em]">
          Promise Kept
        </span>
      )}
      {log.notes && (
        <span className="text-gray-400 text-[10px] italic ml-auto truncate max-w-[160px]">
          {log.notes}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function HistoricalSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const { sessionId } = await params;

  const detail = await getHistoricalSessionDetail(sessionId, dbUser.id);
  if (!detail) notFound();

  const snapshot = parseSnapshot(detail.snapshot);

  // Group set logs by exerciseId for O(1) lookup per set row
  const logsByExercise = new Map<string, HistoricalSetLog[]>();
  for (const log of detail.setLogs) {
    const list = logsByExercise.get(log.workoutTemplateExerciseId) ?? [];
    list.push(log);
    logsByExercise.set(log.workoutTemplateExerciseId, list);
  }

  const allExercises: SnapshotExercise[] = snapshot
    ? [
        ...snapshot.sections.flatMap((s) => s.exercises),
        ...snapshot.unsectioned,
      ]
    : [];

  const sortedSections = snapshot
    ? [...snapshot.sections].sort((a, b) => a.orderIndex - b.orderIndex)
    : [];
  const sortedUnsectioned = snapshot
    ? [...snapshot.unsectioned].sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const hasSnapshot = snapshot !== null && allExercises.length > 0;
  const hasLogs = detail.setLogs.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back navigation */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-gray-400 text-[11px] uppercase tracking-[0.15em] hover:text-white transition-colors mb-6"
      >
        ← Training History
      </Link>

      {/* Session header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              {statusBadge(detail.status)}
              {detail.completionPercent > 0 && (
                <span className="text-[#C9A24D] text-[10px] font-bold">{detail.completionPercent}%</span>
              )}
            </div>
            <h1 className="text-white text-xl font-bold tracking-wide leading-tight">
              {detail.workoutName}
            </h1>
            {detail.programName && (
              <p className="text-gray-400 text-xs mt-1">{detail.programName}</p>
            )}
          </div>
          {detail.programWeekNumber && (
            <div className="shrink-0 text-right">
              <p className="text-[#C9A24D] text-lg font-bold leading-tight">
                {detail.programWeekNumber}
              </p>
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.3em]">week</p>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-0.5 mt-3">
          {detail.scheduledDate && (
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500 uppercase tracking-[0.1em] text-[9px] mr-2">Scheduled</span>
              {fmtDate(detail.scheduledDate)}
            </p>
          )}
          {detail.completedAt && (
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500 uppercase tracking-[0.1em] text-[9px] mr-2">Completed</span>
              {fmtDate(detail.completedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Skipped state */}
      {detail.status === "skipped" && (
        <div className="border border-dashed border-white/[0.08] px-5 py-5 mb-6 text-center">
          <p className="text-gray-400 text-sm">This session was skipped.</p>
          {detail.clientNotes && (
            <p className="text-gray-400 text-xs italic mt-2">{detail.clientNotes}</p>
          )}
        </div>
      )}

      {/* Workout structure */}
      {detail.status !== "skipped" && (
        <>
          {hasSnapshot ? (
            <>
              {sortedSections.map((sec) => (
                <div key={sec.id} className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-[9px] text-gray-400 uppercase tracking-[0.5em] font-semibold">
                      {sec.name}
                    </p>
                    {sec.estimatedMinutes && (
                      <span className="text-gray-500 text-[10px]">{sec.estimatedMinutes} min</span>
                    )}
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  {[...sec.exercises]
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((ex) => (
                      <ExerciseBlock
                        key={ex.id}
                        exercise={ex}
                        logs={logsByExercise.get(ex.id) ?? []}
                      />
                    ))}
                </div>
              ))}

              {sortedUnsectioned.length > 0 && (
                <div className="mb-5">
                  {sortedUnsectioned.map((ex) => (
                    <ExerciseBlock
                      key={ex.id}
                      exercise={ex}
                      logs={logsByExercise.get(ex.id) ?? []}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="border border-dashed border-white/[0.08] px-5 py-5 mb-6">
              <p className="text-gray-400 text-sm text-center">
                Workout structure unavailable for this session.
              </p>
              {hasLogs && (
                <p className="text-gray-500 text-xs text-center mt-1">
                  Performance data was recorded — {detail.setLogs.length} set{detail.setLogs.length !== 1 ? "s" : ""} logged.
                </p>
              )}
            </div>
          )}

          {/* No logs state (has structure but nothing was logged) */}
          {hasSnapshot && !hasLogs && detail.status === "completed" && (
            <div className="border border-dashed border-white/[0.06] px-5 py-4 mb-6 text-center">
              <p className="text-gray-400 text-xs">No performance data was logged for this session.</p>
            </div>
          )}

          {/* Client notes */}
          {detail.clientNotes && detail.status !== "skipped" && (
            <div className="border-t border-white/[0.06] pt-4 mt-4">
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.3em] mb-1.5">Your notes</p>
              <p className="text-gray-400 text-sm leading-relaxed">{detail.clientNotes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
