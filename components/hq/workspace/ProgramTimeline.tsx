// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Program Timeline (Sprint 6.3A)
//
// Server component. Replaces the static CurrentProgramPanel.
// Shows:
//   - Week-by-week timeline (completed / current / upcoming)
//   - Overall progress bar
//   - Projected completion date
//   - Program assignment history below
//
// Empty state: premium illustration + gold CTA (injected via prop)
// ─────────────────────────────────────────────────────────────

import type { ActiveProgramInfo } from "@/lib/db/coach-client-workspace-service";
import type { ProgramHistoryItem } from "@/lib/db/coach-program-assignment-service";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  completed: "Completed",
  cancelled: "Archived",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400 border-emerald-500/30",
  inactive: "text-gray-500 border-gray-600",
  completed: "text-blue-400 border-blue-500/30",
  cancelled: "text-gray-600 border-gray-700",
};

// ─────────────────────────────────────────────────────────────
// SECTION HEADER (local — matches page.tsx convention)
// ─────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-semibold shrink-0">
        {title}
      </h2>
      <div className="flex-1 h-px bg-white/[0.04]" />
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────

function EmptyProgramState({ action }: { action: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/[0.08] px-8 py-12 text-center">
      {/* Inline SVG illustration — program structure icon */}
      <div className="flex justify-center mb-6">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden
          className="opacity-20"
        >
          <rect x="4" y="8" width="40" height="6" rx="1" fill="#C9A24D" />
          <rect x="4" y="18" width="28" height="4" rx="1" fill="#C9A24D" opacity="0.6" />
          <rect x="4" y="26" width="36" height="4" rx="1" fill="#C9A24D" opacity="0.4" />
          <rect x="4" y="34" width="20" height="4" rx="1" fill="#C9A24D" opacity="0.25" />
          <circle cx="42" cy="38" r="6" fill="#C9A24D" opacity="0.3" />
          <path
            d="M39.5 38 L41.5 40 L44.5 36"
            stroke="#C9A24D"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      </div>

      <h3 className="text-white text-sm font-semibold mb-2">No Program Assigned</h3>
      <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto mb-6">
        Assign a blueprint to begin this client&apos;s coaching journey. The program will
        appear here with full week-by-week tracking.
      </p>

      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK ROW
// ─────────────────────────────────────────────────────────────

function WeekRow({
  weekNumber,
  status,
  totalWeeks,
}: {
  weekNumber: number;
  status: "completed" | "current" | "upcoming";
  totalWeeks: number;
}) {
  const isLast = weekNumber === totalWeeks;

  return (
    <div className="flex items-center gap-3 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-3 h-3 rounded-full border-2 transition-colors ${
            status === "completed"
              ? "bg-emerald-500/30 border-emerald-500/60"
              : status === "current"
              ? "bg-[#C9A24D] border-[#C9A24D]"
              : "bg-transparent border-white/[0.10]"
          }`}
          aria-hidden
        />
        {!isLast && (
          <div
            className={`w-px mt-0.5 ${
              status === "completed" ? "bg-emerald-500/20" : "bg-white/[0.04]"
            }`}
            style={{ height: "20px" }}
          />
        )}
      </div>

      {/* Row content */}
      <div
        className={`flex-1 flex items-center justify-between py-1.5 px-3 transition-colors ${
          status === "current"
            ? "bg-[#C9A24D]/[0.05] border border-[#C9A24D]/20"
            : "border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold ${
              status === "current"
                ? "text-[#C9A24D]"
                : status === "completed"
                ? "text-gray-400"
                : "text-gray-600"
            }`}
          >
            Week {weekNumber}
          </span>
          {status === "current" && (
            <span className="text-[8px] text-[#C9A24D]/70 uppercase tracking-[0.25em] font-semibold">
              Current
            </span>
          )}
        </div>

        {status === "completed" && (
          <span className="text-emerald-400 text-[10px]">✓</span>
        )}
        {status === "upcoming" && (
          <span className="text-gray-700 text-[9px] uppercase tracking-[0.15em]">Upcoming</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACTIVE PROGRAM TIMELINE
// ─────────────────────────────────────────────────────────────

function ActiveTimeline({
  program,
  replaceAction,
}: {
  program: ActiveProgramInfo;
  replaceAction: React.ReactNode;
}) {
  const totalWeeks = program.totalWeeks ?? 0;
  const currentWeek = Math.min(program.currentWeek, totalWeeks > 0 ? totalWeeks : program.currentWeek);
  const completedWeeks = Math.max(0, currentWeek - 1);
  const upcomingWeeks = totalWeeks > 0 ? Math.max(0, totalWeeks - currentWeek) : 0;
  const completionEndDate = program.endDate ?? program.derivedEndDate;

  return (
    <section>
      <SectionHeader
        title="Active Program"
        action={replaceAction}
      />

      {/* Program header */}
      <div className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-4 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-white font-bold text-base leading-tight">{program.name}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {program.startDate && (
                <span className="text-gray-500 text-[10px]">
                  Started {fmtDate(program.startDate)}
                </span>
              )}
              {completionEndDate && (
                <span className="text-gray-500 text-[10px]">
                  Ends {fmtDate(completionEndDate)}
                </span>
              )}
              {program.daysRemaining !== null && (
                <span
                  className={`text-[10px] font-semibold ${
                    program.daysRemaining <= 7 ? "text-amber-400" : "text-gray-400"
                  }`}
                >
                  {program.daysRemaining}d remaining
                </span>
              )}
            </div>
          </div>
          {totalWeeks > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[#C9A24D] text-2xl font-bold leading-none">{currentWeek}</p>
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.3em]">
                / {totalWeeks} wks
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {program.programCompletionPct !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em]">Progress</p>
              <p className="text-[10px] text-[#C9A24D] font-bold">
                {program.programCompletionPct}%
              </p>
            </div>
            <div className="h-px bg-white/[0.06] relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#C9A24D]/60 transition-all"
                style={{ width: `${Math.min(100, program.programCompletionPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        {totalWeeks > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">Completed</p>
              <p className="text-emerald-400 text-sm font-bold">{completedWeeks}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">Remaining</p>
              <p className="text-gray-300 text-sm font-bold">{upcomingWeeks}</p>
            </div>
            {program.recommendedDaysPerWeek && (
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">Days/Wk</p>
                <p className="text-gray-300 text-sm font-bold">{program.recommendedDaysPerWeek}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week-by-week timeline */}
      {totalWeeks > 0 && (
        <div className="bg-[#0a0b0c] border border-white/[0.05] px-4 py-4">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-4">
            Program Timeline
          </p>
          <div className="space-y-0">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((wk) => {
              const status =
                wk < currentWeek
                  ? ("completed" as const)
                  : wk === currentWeek
                  ? ("current" as const)
                  : ("upcoming" as const);
              return (
                <WeekRow
                  key={wk}
                  weekNumber={wk}
                  status={status}
                  totalWeeks={totalWeeks}
                />
              );
            })}
          </div>

          {completionEndDate && (
            <p className="text-[9px] text-gray-600 mt-4 pt-3 border-t border-white/[0.04]">
              Projected completion:{" "}
              <span className="text-gray-400">{fmtDate(completionEndDate)}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRAM HISTORY
// ─────────────────────────────────────────────────────────────

function ProgramHistory({ items }: { items: ProgramHistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <SectionHeader title="Program History" />
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-[#0a0b0c] border border-white/[0.05] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-xs font-semibold">{item.programName}</p>
                  <span
                    className={`text-[8px] uppercase tracking-[0.2em] font-semibold border px-1.5 py-0.5 ${
                      STATUS_COLOR[item.status] ?? "text-gray-500 border-gray-700"
                    }`}
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-gray-500 text-[10px]">
                    {fmtDateShort(item.startDate)}
                    {item.endDate ? ` → ${fmtDateShort(item.endDate)}` : " → present"}
                  </span>
                  {item.totalWeeks && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-600 text-[10px]">{item.totalWeeks}w</span>
                    </>
                  )}
                </div>
                {item.coachNotes && (
                  <p className="text-gray-600 text-[10px] mt-1 italic line-clamp-1">
                    {item.coachNotes}
                  </p>
                )}
              </div>
              <p className="text-gray-600 text-[9px] shrink-0">
                Assigned {fmtDateShort(item.assignedAt.slice(0, 10))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

interface Props {
  activeProgram: ActiveProgramInfo | null;
  programHistory: ProgramHistoryItem[];
  emptyStateAction: React.ReactNode;
  replaceAction: React.ReactNode;
}

export default function ProgramTimeline({
  activeProgram,
  programHistory,
  emptyStateAction,
  replaceAction,
}: Props) {
  // Non-active programs for the history section
  const historyItems = programHistory.filter((p) => p.status !== "active");

  if (!activeProgram) {
    return (
      <section>
        <SectionHeader title="Active Program" action={null} />
        <EmptyProgramState action={emptyStateAction} />
        <ProgramHistory items={historyItems} />
      </section>
    );
  }

  return (
    <div>
      <ActiveTimeline program={activeProgram} replaceAction={replaceAction} />
      <ProgramHistory items={historyItems} />
    </div>
  );
}
