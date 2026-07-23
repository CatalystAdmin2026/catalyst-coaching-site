import type { PromisesKeptStats } from "@/lib/db/portal-dashboard-service";

interface Props {
  stats: PromisesKeptStats;
  className?: string;
}

function FlameRing({ lit }: { lit: boolean }) {
  return (
    <div className="relative w-20 h-20 shrink-0">
      {/* Diffuse glow behind the ring */}
      {lit && (
        <div className="absolute inset-[-6px] rounded-full bg-[#c9a24d]/[0.06] blur-md" />
      )}
      {/* Gold ring */}
      <div
        className={`absolute inset-0 rounded-full ${
          lit
            ? "border-2 border-[#c9a24d] shadow-[0_0_20px_rgba(201,162,77,0.25),inset_0_0_10px_rgba(201,162,77,0.07)]"
            : "border border-white/[0.08]"
        }`}
      />
      {/* Flame icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3C9.5 7.5 6 9.5 6 13.5a6 6 0 0 0 12 0C18 9.5 14.5 7.5 12 3z"
            fill={lit ? "rgba(201,162,77,0.50)" : "rgba(255,255,255,0.04)"}
            stroke={lit ? "rgba(201,162,77,0.90)" : "rgba(255,255,255,0.07)"}
            strokeWidth="0.75"
          />
          <path
            d="M12 8.5C10.8 11 9.5 12 9.5 14.5a2.5 2.5 0 0 0 5 0C14.5 12 13.2 11 12 8.5z"
            fill={lit ? "rgba(220,185,110,0.40)" : "transparent"}
          />
        </svg>
      </div>
    </div>
  );
}

export default function PromiseStreakCard({ stats, className = "" }: Props) {
  const { dailyStreak } = stats;
  const lit = dailyStreak >= 1;

  const message =
    lit
      ? "Keep showing up. It's becoming who you are."
      : "Your next promise starts the streak.";

  return (
    <div
      className={`bg-[#0d0e0f] border border-white/[0.07] p-5 flex flex-col ${className}`}
      style={{ background: "linear-gradient(175deg, #141516 0%, #0c0d0e 100%)" }}
    >
      <p className="text-[9px] text-[#c9a24d]/55 uppercase tracking-[0.5em] font-semibold mb-5">
        Promise Streak
      </p>

      {/* Number + ring — visually dominant */}
      <div className="flex items-center justify-between gap-3 flex-1">
        <div>
          <p
            className={`font-bold leading-none tabular-nums ${lit ? "text-white" : "text-white/15"}`}
            style={{ fontSize: "clamp(3rem, 10vw, 4.5rem)" }}
          >
            {dailyStreak}
          </p>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] mt-1.5">
            {dailyStreak === 1 ? "Day" : "Days"}
          </p>
        </div>

        <FlameRing lit={lit} />
      </div>

      <p className="text-white/32 text-xs leading-relaxed mt-5 pt-4 border-t border-white/[0.05]">
        {message}
      </p>
    </div>
  );
}
