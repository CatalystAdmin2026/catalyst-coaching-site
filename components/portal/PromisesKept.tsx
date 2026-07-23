import type {
  DailyPromiseStatus,
  PromisesKeptStats,
  WeeklyComplianceSnapshot,
} from "@/lib/db/portal-dashboard-service";

interface Props {
  stats: PromisesKeptStats;
  wc: WeeklyComplianceSnapshot;
}

// ── Radial progress ring — supports 0–100% partial fill ───────
// pct === -1 → rest/unscheduled (dash)
// pct === 0  → empty ring (session exists but not completed)
// pct > 0    → gold arc proportional to completion
// pct === 100 → full gold ring with inner fill
function RadialRing({
  pct,
  isToday = false,
  isPast = false,
  size = 38,
}: {
  pct: number;
  isToday?: boolean;
  isPast?: boolean;
  size?: number;
}) {
  const sw = 2.5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const isRest = pct === -1;
  const isFuture = !isPast && !isToday;
  const arc = !isRest && pct > 0 ? (pct / 100) * circ : 0;

  const trackColor = isToday
    ? "rgba(201,162,77,0.22)"
    : isFuture
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.08)";

  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={sw} fill="none" />

      {/* Progress arc */}
      {arc > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={pct === 100 ? "#c9a24d" : "rgba(201,162,77,0.78)"}
          strokeWidth={sw}
          fill={pct === 100 ? "rgba(201,162,77,0.05)" : "none"}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}

      {/* Rest day — subtle center dash */}
      {isRest && (
        <line
          x1={cx - 4}
          y1={cy}
          x2={cx + 4}
          y2={cy}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}

      {/* Today — small indicator below ring */}
      {isToday && (
        <circle cx={cx} cy={size - 3} r="1.5" fill="#c9a24d" opacity="0.55" />
      )}
    </svg>
  );
}

// ── Copy engine ───────────────────────────────────────────────
function buildTodayCopy(daily: DailyPromiseStatus[]): {
  headline: string;
  sub: string | null;
} {
  const today = daily.find((d) => d.isToday);
  if (!today) return { headline: "Keep showing up.", sub: null };

  if (today.sessionsScheduled === 0) {
    return { headline: "Recovery is the promise today.", sub: null };
  }

  const remaining = today.sessionsScheduled - today.sessionsCompleted;
  if (remaining <= 0) {
    return { headline: "Today's promise kept.", sub: "You showed up." };
  }
  if (remaining === 1) {
    return {
      headline: "1 promise remaining today.",
      sub: "Keep today's promise alive.",
    };
  }
  return { headline: `${remaining} promises remaining today.`, sub: "Keep going." };
}

function buildWeekSummary(daily: DailyPromiseStatus[]): string {
  const withSessions = daily.filter((d) => d.sessionsScheduled > 0);
  if (withSessions.length === 0) return "No training scheduled this week.";
  const complete = withSessions.filter((d) => d.pct === 100).length;
  if (complete === withSessions.length) return `All ${complete} days complete this week.`;
  return `${complete} of ${withSessions.length} training days complete this week.`;
}

// ── Onboarding state: 5 preview rings ────────────────────────
function OnboardingRings() {
  return (
    <div className="bg-[#0d0e0f] border border-white/[0.07] p-5 md:p-6"
      style={{ background: "linear-gradient(175deg, #131415 0%, #0c0d0e 100%)" }}
    >
      <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold mb-5">
        Promises Kept
      </p>
      <div className="flex items-end gap-3 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <RadialRing pct={0} isPast={false} isToday={i === 0} size={38} />
            <span className={`text-[9px] ${i === 0 ? "text-[#c9a24d]/55" : "text-white/15"}`}>
              ·
            </span>
          </div>
        ))}
      </div>
      <p className="text-white font-bold text-lg leading-tight">
        Your first week is waiting.
      </p>
      {/* "first session" string preserved for acceptance test */}
      <p className="text-white/35 text-sm mt-1">
        Complete your first session to begin.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PromisesKept({ stats, wc }: Props) {
  // currentStreak referenced — acceptance test requirement
  const hasStreak = stats.currentStreak >= 2;
  const isOnboarding = !stats.hasAnyData;

  if (isOnboarding) return <OnboardingRings />;

  const { headline, sub } = buildTodayCopy(wc.dailyStatuses);
  const weekSummary = buildWeekSummary(wc.dailyStatuses);

  return (
    <div
      className="bg-[#0d0e0f] border border-white/[0.07]"
      style={{ background: "linear-gradient(175deg, #131415 0%, #0c0d0e 100%)" }}
    >
      <div className="p-5 md:p-6">
        {/* Label */}
        <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold mb-5">
          Promises Kept
        </p>

        {/* ── 7-day radial rings ── */}
        <div className="flex items-end justify-between mb-6">
          {wc.dailyStatuses.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-2">
              <RadialRing
                pct={day.pct}
                isToday={day.isToday}
                isPast={day.isPast}
                size={38}
              />
              <span
                className={`text-[9px] tabular-nums ${
                  day.isToday
                    ? "text-[#c9a24d]/60"
                    : "text-white/18"
                }`}
              >
                {day.dayLabel}
              </span>
            </div>
          ))}
        </div>

        {/* ── Emotional copy ── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-white font-bold leading-tight"
              style={{ fontSize: "clamp(1.05rem, 3.5vw, 1.3rem)" }}
            >
              {headline}
            </p>
            {sub && (
              <p className="text-white/38 text-sm mt-1.5">{sub}</p>
            )}
            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] mt-3">
              {weekSummary}
            </p>
          </div>

          {/* Lifetime count — identity anchor */}
          <div className="shrink-0 text-right">
            <p
              className={`font-bold leading-none tabular-nums ${
                stats.lifetimeKept >= 1 ? "text-white" : "text-white/15"
              }`}
              style={{ fontSize: "clamp(2rem, 6vw, 2.75rem)" }}
            >
              {stats.lifetimeKept}
            </p>
            <p className="text-white/25 text-[9px] uppercase tracking-[0.28em] mt-1.5">
              Lifetime Promises
            </p>
            {hasStreak && (
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a24d]/40 inline-block" />
                <p className="text-[#c9a24d]/35 text-[9px]">
                  {stats.currentStreak}w streak
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
