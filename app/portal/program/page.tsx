import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import { listClientPrograms } from "@/lib/db/client-program-service";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400 border-emerald-500/30",
  completed: "text-gray-400 border-gray-600/40",
  paused: "text-amber-400 border-amber-500/30",
  cancelled: "text-red-400 border-red-500/30",
};

function fmtDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysBetween(from: string, to: Date): number {
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to.toISOString().slice(0, 10) + "T00:00:00Z");
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

// Estimate completion date: start + totalWeeks * 7 days
function estimateEndDate(startDate: string, totalWeeks: number): string {
  const end = new Date(startDate + "T12:00:00");
  end.setDate(end.getDate() + totalWeeks * 7);
  return end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface WeekDot {
  weekNumber: number;
  state: "past" | "current" | "future" | "not_started";
}

function buildWeekTimeline(
  startDate: string,
  totalWeeks: number | null,
): WeekDot[] {
  if (!totalWeeks) return [];
  const elapsed = daysBetween(startDate, new Date());
  const currentWeek = elapsed < 0 ? 0 : Math.floor(elapsed / 7) + 1;

  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    let state: WeekDot["state"];
    if (elapsed < 0) {
      state = "not_started";
    } else if (weekNum < currentWeek) {
      state = "past";
    } else if (weekNum === currentWeek) {
      state = "current";
    } else {
      state = "future";
    }
    return { weekNumber: weekNum, state };
  });
}

function WeekTimeline({
  startDate,
  totalWeeks,
}: {
  startDate: string;
  totalWeeks: number | null;
}) {
  const weeks = buildWeekTimeline(startDate, totalWeeks);
  if (weeks.length === 0) return null;

  const elapsed = daysBetween(startDate, new Date());
  const currentWeekNum = elapsed < 0 ? null : Math.floor(elapsed / 7) + 1;
  const pastCount = weeks.filter((w) => w.state === "past").length;
  const pct = totalWeeks ? Math.round((pastCount / totalWeeks) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {currentWeekNum && totalWeeks && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-[#c9a24d]/45 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-white/35 tabular-nums shrink-0">
            {pct}%
          </p>
        </div>
      )}

      {/* Week dots */}
      <div className="flex flex-wrap gap-1">
        {weeks.slice(0, 24).map((w) => (
          <div
            key={w.weekNumber}
            title={`Week ${w.weekNumber}`}
            aria-label={`Week ${w.weekNumber}: ${w.state}`}
            className={`flex items-center justify-center transition-all ${
              w.state === "current"
                ? "w-8 h-8 border border-[#c9a24d] bg-[#c9a24d]/10"
                : w.state === "past"
                  ? "w-4 h-4 bg-[#c9a24d]/30"
                  : "w-4 h-4 border border-white/[0.10] bg-transparent"
            }`}
          >
            {w.state === "current" && (
              <span className="text-[9px] font-bold text-[#c9a24d] tabular-nums leading-none">
                {w.weekNumber}
              </span>
            )}
          </div>
        ))}
        {weeks.length > 24 && (
          <div className="w-4 h-4 flex items-center justify-center">
            <span className="text-[9px] text-white/20">+{weeks.length - 24}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5">
        <span className="flex items-center gap-1.5 text-[9px] text-white/25">
          <span className="w-2 h-2 bg-[#c9a24d]/30 inline-block" />
          Completed
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-white/25">
          <span className="w-2 h-2 border border-[#c9a24d] inline-block" />
          This week
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-white/25">
          <span className="w-2 h-2 border border-white/[0.10] inline-block" />
          Upcoming
        </span>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] font-semibold mb-3">
      {children}
    </p>
  );
}

export default async function ProgramPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const [profile, programs] = await Promise.all([
    getClientProfile(dbUser.id),
    listClientPrograms(dbUser.id),
  ]);

  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";
  const activeProgram = programs.find((p) => p.assignment.status === "active");
  const pastPrograms = programs.filter((p) => p.assignment.status !== "active");

  // Compute current week stats for the active program
  let currentWeekNum: number | null = null;
  let weeksRemaining: number | null = null;
  let estimatedEnd: string | null = null;

  if (activeProgram) {
    const elapsed = daysBetween(activeProgram.assignment.startDate, new Date());
    if (elapsed >= 0 && activeProgram.totalWeeks) {
      currentWeekNum = Math.min(Math.floor(elapsed / 7) + 1, activeProgram.totalWeeks);
      weeksRemaining = Math.max(0, activeProgram.totalWeeks - currentWeekNum);
    } else if (elapsed < 0) {
      currentWeekNum = null; // not started yet
    }
    if (activeProgram.totalWeeks) {
      estimatedEnd = estimateEndDate(activeProgram.assignment.startDate, activeProgram.totalWeeks);
    }
  }

  return (
    <PortalShell clientName={clientName}>
      <div className="space-y-10">
        {/* Page header */}
        <div>
          <h1 className="text-white text-xl font-bold tracking-wide">My Program</h1>
          <p className="text-gray-400 text-sm mt-1">
            Where you are, what&apos;s next, and what your coach wants you focused on.
          </p>
        </div>

        {programs.length === 0 ? (
          /* ── No program empty state ── */
          <div className="border border-white/[0.07] bg-[#0d0e0f] px-6 py-8">
            <p className="text-white/45 text-sm font-medium mb-1.5">No program assigned yet</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Your coach will assign your first training block once onboarding is complete.
              In the meantime, focus on sleep consistency and building your nutrition baseline.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {activeProgram && (
              <div className="space-y-6">
                {/* ── Current week hero stats ── */}
                {currentWeekNum !== null && activeProgram.totalWeeks && (
                  <div>
                    <SectionLabel>Where You Are</SectionLabel>
                    <div className="grid grid-cols-3 gap-px bg-white/[0.05]">
                      <div className="bg-[#0a0b0c] px-4 py-5 text-center">
                        <p className="text-3xl font-bold text-white tabular-nums leading-none">
                          {currentWeekNum}
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1.5">
                          Current Week
                        </p>
                      </div>
                      <div className="bg-[#0a0b0c] px-4 py-5 text-center">
                        <p className="text-3xl font-bold text-[#c9a24d]/80 tabular-nums leading-none">
                          {weeksRemaining}
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1.5">
                          Weeks Left
                        </p>
                      </div>
                      <div className="bg-[#0a0b0c] px-4 py-5 text-center">
                        <p className="text-sm font-bold text-white/65 tabular-nums leading-none">
                          {estimatedEnd ?? "—"}
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-1.5">
                          Est. Finish
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Not started yet */}
                {currentWeekNum === null && activeProgram.totalWeeks && (
                  <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-sm font-medium">Program starts {fmtDate(activeProgram.assignment.startDate)}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{activeProgram.totalWeeks} weeks · {estimatedEnd && `Estimated finish ${estimatedEnd}`}</p>
                      </div>
                      <span className="text-[9px] font-semibold border px-2 py-0.5 text-amber-400 border-amber-500/30 shrink-0">
                        Not Started
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Program overview ── */}
                <div>
                  <SectionLabel>Program</SectionLabel>
                  <div className="border border-white/[0.07] bg-[#0a0b0c] px-5 py-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-white font-bold text-base leading-snug">
                          {activeProgram.programName}
                        </h2>
                        {activeProgram.programCategory && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {activeProgram.programCategory}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-semibold border px-2 py-0.5 text-emerald-400 border-emerald-500/30 shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-0.5">Start Date</p>
                        <p className="text-white/75 text-sm font-medium">
                          {fmtDate(activeProgram.assignment.startDate)}
                        </p>
                      </div>
                      {activeProgram.totalWeeks && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-0.5">Duration</p>
                          <p className="text-white/75 text-sm font-medium">
                            {activeProgram.totalWeeks} weeks
                          </p>
                        </div>
                      )}
                      {activeProgram.assignment.endDate && (
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-0.5">End Date</p>
                          <p className="text-white/75 text-sm font-medium">
                            {fmtDate(activeProgram.assignment.endDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Coach notes — prominent position ── */}
                {activeProgram.assignment.coachNotes && (
                  <div>
                    <SectionLabel>Coach Notes</SectionLabel>
                    <div className="border border-[#c9a24d]/15 bg-[#c9a24d]/[0.03] px-5 py-4 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-[#c9a24d]/25" aria-hidden />
                      <p className="text-gray-300 text-sm leading-relaxed pl-1">
                        {activeProgram.assignment.coachNotes}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Week timeline ── */}
                {activeProgram.totalWeeks && (
                  <div>
                    <SectionLabel>Timeline</SectionLabel>
                    <WeekTimeline
                      startDate={activeProgram.assignment.startDate}
                      totalWeeks={activeProgram.totalWeeks}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Past programs ── */}
            {pastPrograms.length > 0 && (
              <div>
                <SectionLabel>Program History</SectionLabel>
                <div className="space-y-1.5">
                  {pastPrograms.map((p) => (
                    <div
                      key={p.assignment.id}
                      className="flex items-center justify-between gap-4 border border-white/[0.06] bg-[#0d0e0f] px-4 py-3"
                    >
                      <div>
                        <p className="text-white/65 text-sm font-medium">{p.programName}</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">
                          Started {fmtDate(p.assignment.startDate)}
                          {p.totalWeeks && ` · ${p.totalWeeks} weeks`}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-semibold border px-2 py-0.5 shrink-0 ${
                          STATUS_COLOR[p.assignment.status] ?? "text-gray-400 border-gray-600/40"
                        }`}
                      >
                        {STATUS_LABEL[p.assignment.status] ?? p.assignment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
