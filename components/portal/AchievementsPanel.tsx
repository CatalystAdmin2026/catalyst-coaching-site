import type { Achievement } from "@/lib/db/portal-dashboard-service";

// Category marks — abstract but consistent with brand geometry
const CATEGORY_MARK: Record<Achievement["category"], string> = {
  milestone: "◆",
  consistency: "▲",
  accountability: "●",
};

function EarnedBadge({ achievement }: { achievement: Achievement }) {
  const mark = CATEGORY_MARK[achievement.category];

  return (
    <div
      className="border border-[#c9a24d]/20 bg-[#c9a24d]/[0.03] px-4 py-4 flex flex-col gap-2.5 relative overflow-hidden"
      aria-label={`${achievement.title}: earned`}
    >
      {/* Subtle accent corner */}
      <div className="absolute top-0 left-0 w-px h-full bg-[#c9a24d]/20" aria-hidden />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#c9a24d]/70" aria-hidden>{mark}</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/85 truncate">
            {achievement.title}
          </p>
        </div>
        <span className="text-[9px] text-emerald-400/70 shrink-0" aria-hidden>✓</span>
      </div>
      <p className="text-[10px] leading-relaxed text-white/40">
        {achievement.description}
      </p>
    </div>
  );
}

function LockedBadge({ achievement }: { achievement: Achievement }) {
  const mark = CATEGORY_MARK[achievement.category];

  return (
    <div
      className="border border-white/[0.05] bg-[#0d0e0f] px-4 py-4 flex flex-col gap-2.5 opacity-35"
      aria-label={`${achievement.title}: locked`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/20" aria-hidden>{mark}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50 truncate">
          {achievement.title}
        </p>
      </div>
      <p className="text-[10px] leading-relaxed text-white/30">
        {achievement.description}
      </p>
    </div>
  );
}

interface Props {
  achievements: Achievement[];
}

export default function AchievementsPanel({ achievements }: Props) {
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  if (earned.length === 0 && locked.length === 0) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-white/35 text-sm font-medium mb-1">Nothing yet</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Complete your first workout to unlock your first achievement. Consistency is the only currency here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <div>
          <p className="text-[9px] text-emerald-500/60 uppercase tracking-[0.4em] font-semibold mb-2.5">
            Earned · {earned.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {earned.map((a) => (
              <EarnedBadge key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em] font-semibold mb-2.5">
            Locked · {locked.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locked.map((a) => (
              <LockedBadge key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
