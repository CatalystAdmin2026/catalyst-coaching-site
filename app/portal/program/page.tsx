import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import {
  getProgramPageData,
  type ActiveGoalData,
  type ActiveProgramData,
  type DaySchedule,
  type ProgramWeekPreview,
} from "@/lib/db/client-program-service";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtGoalType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtShortDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function fmtLongDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Phase {
  label: string | null;
  weekNumbers: number[];
}

function groupPhases(allWeeks: ProgramWeekPreview[]): Phase[] {
  const phases: Phase[] = [];
  for (const w of allWeeks) {
    const last = phases[phases.length - 1];
    if (last && last.label === w.label) {
      last.weekNumbers.push(w.weekNumber);
    } else {
      phases.push({ label: w.label, weekNumbers: [w.weekNumber] });
    }
  }
  return phases;
}

// ─────────────────────────────────────────────────────────────
// HERO COMPONENTS — exactly one renders at the top of the page
// ─────────────────────────────────────────────────────────────

// 1. Goal hero — when the client has an active goal on file
function GoalSection({ goal }: { goal: ActiveGoalData }) {
  return (
    <div className="relative overflow-hidden bg-[#0d0e0f] border border-white/[0.07]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#c9a24d]" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 150% at 0% -10%, rgba(201,162,77,0.09) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden
      >
        <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
          {[54, 40, 27, 15].map((r) => (
            <circle
              key={r}
              cx="55"
              cy="55"
              r={r}
              stroke="rgba(201,162,77,0.055)"
              strokeWidth="1"
            />
          ))}
          <circle cx="55" cy="55" r="4" fill="rgba(201,162,77,0.10)" />
        </svg>
      </div>
      <div className="relative p-6 md:p-8 pt-8 pr-28 md:pr-32">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold">
            Your Goal
          </p>
          <span className="text-[8px] text-white/25 border border-white/[0.08] px-2 py-0.5 uppercase tracking-[0.2em]">
            {fmtGoalType(goal.goalType)}
          </span>
        </div>
        <p
          className="text-white font-bold leading-tight"
          style={{ fontSize: "clamp(2rem, 7vw, 3.5rem)" }}
        >
          {goal.description}
        </p>
        {(goal.targetDate || (goal.targetValue && goal.targetUnit)) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-4 border-t border-white/[0.05]">
            {goal.targetDate && (
              <p className="text-[10px] text-white/28 uppercase tracking-[0.15em]">
                Target &nbsp;{fmtShortDate(goal.targetDate)}
              </p>
            )}
            {goal.targetValue && goal.targetUnit && (
              <p className="text-[10px] text-white/28 uppercase tracking-[0.15em]">
                {goal.targetValue} {goal.targetUnit}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Focus hero — phase label exists but no goal on file
function FocusHero({
  label,
  program,
}: {
  label: string;
  program: ActiveProgramData;
}) {
  return (
    <div className="relative overflow-hidden bg-[#0d0e0f] border border-white/[0.07]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#c9a24d]" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 150% at 0% -10%, rgba(201,162,77,0.06) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative p-6 md:p-8 pt-8">
        <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold mb-4">
          Current Focus
        </p>
        {/* Phase name — the anchor */}
        <h2
          className="text-white font-bold leading-tight"
          style={{ fontSize: "clamp(2rem, 7vw, 3.5rem)" }}
        >
          {label}
        </h2>
        {/* Phase notes — the WHY, directly below the name */}
        {program.currentWeekNotes && (
          <p className="text-white/45 text-sm leading-relaxed mt-3">
            {program.currentWeekNotes}
          </p>
        )}
        {/* Week position — supporting detail, not the story */}
        <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] mt-5">
          Week {program.currentWeekNum}
          {program.totalWeeks && ` of ${program.totalWeeks}`}
        </p>
      </div>
    </div>
  );
}

// 3. Preparing hero — program assigned, hasn't started, no goal on file
function PreparingHero({
  startDate,
  label,
}: {
  startDate: string;
  label: string | null;
}) {
  return (
    <div className="relative overflow-hidden bg-[#0d0e0f] border border-white/[0.07]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#c9a24d]" aria-hidden />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 150% at 0% -10%, rgba(201,162,77,0.06) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative p-6 md:p-8 pt-8">
        <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold mb-4">
          Your Plan
        </p>
        <h2
          className="text-white font-bold leading-tight"
          style={{ fontSize: "clamp(2rem, 7vw, 3.5rem)" }}
        >
          Your plan is ready.
        </h2>
        <p className="text-white/40 text-sm mt-2">
          Your training begins {fmtLongDate(startDate)}.
        </p>
        {label && (
          <p className="text-[10px] text-[#c9a24d]/45 uppercase tracking-[0.3em] mt-4">
            First Phase — {label}
          </p>
        )}
      </div>
    </div>
  );
}

// 4. Neutral hero — active program, no goal, no phase label
// Program template name is intentionally not shown — it's an internal coach filing name.
// The workout list below answers "what am I doing" more honestly than a template title.
function NeutralPlanHero({ program }: { program: ActiveProgramData }) {
  return (
    <div className="relative bg-[#0d0e0f] border border-white/[0.07]">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#c9a24d]/40" aria-hidden />
      <div className="p-6 md:p-8 pt-8">
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-3">
          Your Program
        </p>
        <p className="text-sm">
          <span className="text-[#c9a24d]/65 font-medium">
            Week {program.currentWeekNum}
          </span>
          {program.totalWeeks && (
            <span className="text-white/20"> of {program.totalWeeks}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CURRENT FOCUS CARD — orientation below GoalSection
// Only shown when goal is the hero, to orient on current phase.
// Never uses programName as a fallback — that's the hero's job.
// ─────────────────────────────────────────────────────────────

function CurrentFocusCard({ program }: { program: ActiveProgramData }) {
  if (program.isPreparing) {
    return (
      <div
        className="bg-[#0d0e0f] border border-white/[0.07] p-5 md:p-6"
        style={{ background: "linear-gradient(175deg, #111213 0%, #0d0e0f 100%)" }}
      >
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-3">
          What to Expect
        </p>
        {program.currentWeekLabel && (
          <h3 className="text-white/80 text-base font-medium mb-1">
            {program.currentWeekLabel}
          </h3>
        )}
        <p className="text-white/38 text-sm">
          Training begins {fmtLongDate(program.startDate)}.
        </p>
        {program.currentWeekNotes && (
          <p className="text-white/30 text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.04]">
            {program.currentWeekNotes}
          </p>
        )}
      </div>
    );
  }

  // TECH DEBT: This branch is unreachable. The parent guard (line ~718) only renders
  // CurrentFocusCard when currentWeekLabel || isPreparing. If isPreparing=false and
  // currentWeekLabel=null, the guard is false and this component never mounts.
  // Remove when the guard and this component are next refactored together.
  if (!program.currentWeekLabel) {
    return (
      <div
        className="bg-[#0d0e0f] border border-white/[0.07] p-5 md:p-6"
        style={{ background: "linear-gradient(175deg, #111213 0%, #0d0e0f 100%)" }}
      >
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-2">
          Current Focus
        </p>
        <p className="text-sm">
          <span className="text-[#c9a24d]/65 font-medium">
            Week {program.currentWeekNum}
          </span>
          {program.totalWeeks && (
            <span className="text-white/20"> of {program.totalWeeks}</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-[#0d0e0f] border border-white/[0.07] p-5 md:p-6"
      style={{ background: "linear-gradient(175deg, #111213 0%, #0d0e0f 100%)" }}
    >
      <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
        Current Focus
      </p>
      {/* Phase name — dominant, not the week number */}
      <h3
        className="text-white font-bold leading-tight"
        style={{ fontSize: "clamp(1.5rem, 5vw, 2.25rem)" }}
      >
        {program.currentWeekLabel}
      </h3>
      {/* Phase notes — the WHY, visible above the week indicator */}
      {program.currentWeekNotes && (
        <p className="text-white/45 text-sm leading-relaxed mt-3">
          {program.currentWeekNotes}
        </p>
      )}
      {/* Week — supporting info only */}
      <p className="text-[10px] text-white/22 uppercase tracking-[0.2em] mt-4">
        Week {program.currentWeekNum}
        {program.totalWeeks && ` of ${program.totalWeeks}`}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COACH GUIDANCE — the human element
// ─────────────────────────────────────────────────────────────

function CoachGuidanceSection({ notes }: { notes: string }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#c9a24d]/25" />
      <p
        className="font-bold leading-none text-[#c9a24d] select-none pointer-events-none mb-2"
        style={{ fontSize: "clamp(3rem, 8vw, 5rem)", opacity: 0.1, lineHeight: 0.75 }}
        aria-hidden
      >
        &ldquo;
      </p>
      <p className="text-white/62 text-sm leading-[1.8] italic">{notes}</p>
      <p className="text-[9px] text-white/22 uppercase tracking-[0.35em] mt-4">
        Your Coach
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// THIS WEEK — intentional day-by-day plan
// When preparing, shows Week 1 as a preview
// ─────────────────────────────────────────────────────────────

function ThisWeekSection({
  daysSchedule,
  isPreparing,
  startDate,
}: {
  daysSchedule: DaySchedule[];
  isPreparing: boolean;
  startDate: string;
}) {
  const sectionLabel = isPreparing ? "Your First Week" : "Training This Week";

  const hasAnyWorkout = daysSchedule.some((d) => d.workoutName !== null);
  if (!hasAnyWorkout) {
    return (
      <div>
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
          {sectionLabel}
        </p>
        <p className="text-white/30 text-sm">
          {isPreparing
            ? `Your coach will configure your first week before ${fmtLongDate(startDate)}.`
            : "Your coach hasn’t configured this week’s schedule yet."}
        </p>
      </div>
    );
  }

  const displayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-5">
        {sectionLabel}
      </p>
      {isPreparing && (
        <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] mb-4">
          Preview — starts {fmtLongDate(startDate)}
        </p>
      )}
      <div>
        {displayOrder.map((dow, i) => {
          const day = daysSchedule[dow];
          const isRest = !day?.workoutName;
          const isLast = i === displayOrder.length - 1;

          if (isRest) {
            return (
              <div
                key={dow}
                className={`flex items-center gap-4 py-3 opacity-[0.2] ${
                  !isLast ? "border-b border-white/[0.04]" : ""
                }`}
              >
                <span className="text-[10px] text-white/50 w-8 shrink-0 font-mono uppercase tracking-wide">
                  {DAY_LABELS[dow]}
                </span>
                <span className="text-sm text-white/40">Rest</span>
              </div>
            );
          }

          return (
            <div
              key={dow}
              className={`py-4 ${!isLast ? "border-b border-white/[0.04]" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="text-[10px] text-white/40 w-8 shrink-0 font-mono uppercase tracking-wide pt-0.5">
                  {DAY_LABELS[dow]}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-snug ${
                      isPreparing ? "text-white/70" : "text-white"
                    }`}
                  >
                    {day.workoutName}
                  </p>
                  {day.workoutDescription && (
                    <div className="mt-2">
                      <p className="text-[8px] text-[#c9a24d]/45 uppercase tracking-[0.2em] mb-1">
                        Focus
                      </p>
                      <p className="text-xs text-white/38 leading-relaxed">
                        {day.workoutDescription}
                      </p>
                    </div>
                  )}
                </div>
                {day.estimatedMinutes && (
                  <span className="text-[10px] text-white/22 tabular-nums shrink-0 pt-0.5">
                    {day.estimatedMinutes} min
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// YOUR JOURNEY — connected timeline, no terminal language
// ─────────────────────────────────────────────────────────────

function JourneySection({
  allWeeks,
  currentWeekNum,
  totalWeeks,
}: {
  allWeeks: ProgramWeekPreview[];
  currentWeekNum: number | null;
  totalWeeks: number | null;
}) {
  const weeks: ProgramWeekPreview[] =
    allWeeks.length > 0
      ? allWeeks
      : Array.from({ length: totalWeeks ?? 0 }, (_, i) => ({
          weekNumber: i + 1,
          label: null,
          notes: null,
        }));

  if (weeks.length === 0) return null;

  const displayed = weeks.slice(0, 24);
  const overflow = weeks.length - displayed.length;
  const n = displayed.length;

  const usePhases = displayed.some((w) => w.label !== null);
  const phases = usePhases ? groupPhases(displayed) : [];

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${n}, 1fr)`,
    minWidth: `${Math.max(n * 22, 200)}px`,
  };

  return (
    <div>
      <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-5">
        Your Journey
      </p>

      <div className="overflow-x-auto pb-1">
        {/* Phase labels row — phase dominates, week range supports */}
        {usePhases && (
          <div style={gridStyle} className="mb-4">
            {phases.map((phase, pi) => {
              const isCurrentPhase =
                currentWeekNum !== null &&
                phase.weekNumbers.some((wn) => wn === currentWeekNum);
              const isPastPhase =
                currentWeekNum !== null &&
                phase.weekNumbers.every((wn) => wn < currentWeekNum);
              const firstWk = phase.weekNumbers[0];
              const lastWk = phase.weekNumbers[phase.weekNumbers.length - 1];
              const wkRange = firstWk === lastWk ? `Wk ${firstWk}` : `Wks ${firstWk}–${lastWk}`;
              return (
                <div
                  key={pi}
                  style={{ gridColumn: `span ${phase.weekNumbers.length}` }}
                  className="min-w-0 pb-1"
                >
                  <p
                    className={`text-[9px] font-semibold uppercase tracking-[0.2em] truncate ${
                      isCurrentPhase
                        ? "text-[#c9a24d]/80"
                        : isPastPhase
                        ? "text-white/30"
                        : "text-white/22"
                    }`}
                  >
                    {phase.label ?? `Phase ${pi + 1}`}
                  </p>
                  <p
                    className={`text-[7px] mt-px ${
                      isCurrentPhase ? "text-[#c9a24d]/38" : "text-white/14"
                    }`}
                  >
                    {wkRange}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Connected circle timeline */}
        <div style={gridStyle} className="items-center">
          {displayed.map((week, i) => {
            const isPast =
              currentWeekNum !== null && week.weekNumber < currentWeekNum;
            const isCurrent =
              currentWeekNum !== null && week.weekNumber === currentWeekNum;
            const connectorColor =
              isPast || isCurrent
                ? "rgba(201,162,77,0.20)"
                : "rgba(255,255,255,0.10)";

            return (
              <div
                key={week.weekNumber}
                className="relative flex items-center justify-center"
                style={{ height: "32px" }}
                title={`Week ${week.weekNumber}`}
              >
                {/* Left half-connector */}
                {i > 0 && (
                  <div
                    className="absolute right-1/2 left-0 top-1/2 h-px -translate-y-1/2"
                    style={{ background: connectorColor }}
                  />
                )}
                {/* Right half-connector */}
                {i < displayed.length - 1 && (
                  <div
                    className="absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2"
                    style={{
                      background: isPast
                        ? "rgba(201,162,77,0.20)"
                        : "rgba(255,255,255,0.10)",
                    }}
                  />
                )}
                {/* Week circle */}
                <div
                  className={`relative z-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? "w-7 h-7 bg-[#c9a24d] text-black text-[9px] font-bold"
                      : isPast
                      ? "w-3 h-3 bg-[#c9a24d]/30"
                      : "w-3 h-3 border border-white/[0.15]"
                  }`}
                >
                  {isCurrent && (
                    <span className="leading-none">{week.weekNumber}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week number labels — only for shorter programs */}
        {n <= 16 && (
          <div style={gridStyle} className="mt-2">
            {displayed.map((week) => {
              const isCurrent =
                currentWeekNum !== null && week.weekNumber === currentWeekNum;
              return (
                <div key={week.weekNumber} className="text-center">
                  <span
                    className={`text-[7px] tabular-nums ${
                      isCurrent ? "text-[#c9a24d]/55" : "text-white/18"
                    }`}
                  >
                    {week.weekNumber}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {overflow > 0 && (
          <p className="text-[8px] text-white/18 mt-3">
            +{overflow} more weeks ahead
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NO PROGRAM — waiting states
// ─────────────────────────────────────────────────────────────

function NoProgramState({ goal }: { goal: ActiveGoalData | null }) {
  return (
    <div className="space-y-8">
      {goal ? (
        <>
          <GoalSection goal={goal} />
          <div>
            <h1
              className="text-white font-bold leading-tight mb-3"
              style={{ fontSize: "clamp(1.5rem, 5vw, 2.25rem)" }}
            >
              Your program is being built around this goal.
            </h1>
            <p className="text-white/30 text-sm leading-relaxed max-w-sm">
              Your coach has your goal. Your training block will be designed around it.
            </p>
          </div>
        </>
      ) : (
        <div>
          <h1
            className="text-white font-bold leading-tight mb-3"
            style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
          >
            Your program is coming.
          </h1>
          <p className="text-white/35 text-sm leading-relaxed max-w-sm mb-8">
            Your coach needs your starting point first. Submit your first
            check-in and your training block will be built around it.
          </p>
          <Link
            href="/portal/check-ins/new"
            className="inline-block bg-[#c9a24d] text-black text-[11px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#d4af63] transition-colors"
          >
            Start Check-In
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function ProgramPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const profile = await getClientProfile(dbUser.id);
  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  const { goal, activeProgram } = await getProgramPageData(dbUser.id);

  if (!activeProgram) {
    return (
      <PortalShell clientName={clientName}>
        <NoProgramState goal={goal} />
      </PortalShell>
    );
  }

  const { isPreparing } = activeProgram;
  // Phase label from the current (or first, when preparing) week — never programName
  const focusTitle = activeProgram.currentWeekLabel;

  // Hero selection — explicit, never falls back to raw template name
  const hero = goal ? (
    <GoalSection goal={goal} />
  ) : focusTitle ? (
    <FocusHero label={focusTitle} program={activeProgram} />
  ) : isPreparing ? (
    <PreparingHero startDate={activeProgram.startDate} label={null} />
  ) : (
    <NeutralPlanHero program={activeProgram} />
  );

  return (
    <PortalShell clientName={clientName}>
      <div className="flex flex-col gap-7 md:gap-9">
        {/* Hero — exactly one of Goal / Focus / Preparing / Neutral */}
        {hero}

        {/* Orientation card — only when goal is the hero AND the coach configured phase context.
            Gracefully absent when no phases exist: the workout list answers "what this week?" directly. */}
        {goal && (activeProgram.currentWeekLabel || activeProgram.isPreparing) && (
          <CurrentFocusCard program={activeProgram} />
        )}

        {/* Coach guidance */}
        {activeProgram.coachNotes && (
          <CoachGuidanceSection notes={activeProgram.coachNotes} />
        )}

        {/* This week / first week preview */}
        <ThisWeekSection
          daysSchedule={activeProgram.daysSchedule}
          isPreparing={isPreparing}
          startDate={activeProgram.startDate}
        />

        {/* Journey timeline */}
        <JourneySection
          allWeeks={activeProgram.allWeeks}
          currentWeekNum={activeProgram.currentWeekNum}
          totalWeeks={activeProgram.totalWeeks}
        />
      </div>
    </PortalShell>
  );
}
