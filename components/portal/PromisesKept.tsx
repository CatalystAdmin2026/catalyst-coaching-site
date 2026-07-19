import type { PromisesKeptStats } from "@/lib/db/portal-dashboard-service";

interface Props {
  stats: PromisesKeptStats;
}

// Visual streak bar — up to 12 filled marks representing consecutive weeks kept.
// Each mark is one completed week. No fabricated data.
function StreakBar({ count }: { count: number }) {
  const display = Math.min(count, 12);
  if (display === 0) return null;

  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-2.5 bg-[#c9a24d]"
          style={{ opacity: 0.45 + (i / display) * 0.45 }}
          aria-hidden
        />
      ))}
      {count > 12 && (
        <span className="text-[9px] text-[#c9a24d]/40 ml-1.5 tabular-nums">
          +{count - 12}
        </span>
      )}
    </div>
  );
}

function TodayBadge({ kept }: { kept: boolean | null }) {
  if (kept === null) {
    return (
      <span className="text-[10px] text-white/30 tracking-wide">
        No session today
      </span>
    );
  }
  if (kept) {
    return (
      <span className="inline-flex items-center gap-2 text-[10px] text-emerald-400 font-medium">
        <span className="w-1.5 h-1.5 bg-emerald-400 inline-block" aria-hidden />
        Today&apos;s promise kept
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[10px] text-[#c9a24d] font-medium">
      <span className="w-1.5 h-1.5 bg-[#c9a24d] inline-block animate-pulse" aria-hidden />
      Promise pending — session not yet logged
    </span>
  );
}

export default function PromisesKept({ stats }: Props) {
  if (!stats.hasAnyData) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-3">Promises Kept</p>
        <p className="text-white/35 text-sm font-medium mb-1">Your record starts here</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Complete your first workout to begin tracking your consistency. Every session is a promise to yourself.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f]">
      {/* Metrics */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
        {/* Lifetime */}
        <div className="px-5 py-5">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.35em] font-medium mb-2">
            Lifetime
          </p>
          <p className="text-4xl font-bold text-white tabular-nums leading-none">
            {stats.lifetimeKept}
          </p>
          <p className="text-[10px] text-white/30 mt-1.5">sessions completed</p>
        </div>

        {/* Streak */}
        <div className="px-5 py-5">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.35em] font-medium mb-2">
            Streak
          </p>
          <p className="text-4xl font-bold text-[#c9a24d] tabular-nums leading-none">
            {stats.currentStreak}
          </p>
          <p className="text-[10px] text-white/30 mt-1.5">
            {stats.currentStreak === 1 ? "consecutive week" : "consecutive weeks"}
          </p>
          <StreakBar count={stats.currentStreak} />
        </div>
      </div>

      {/* Today's status */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center min-h-[40px]">
        <TodayBadge kept={stats.todayKept} />
      </div>
    </div>
  );
}
