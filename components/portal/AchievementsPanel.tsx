"use client";

import { useEffect, useRef } from "react";
import type { Achievement } from "@/lib/db/portal-dashboard-service";

// Category marks — abstract but consistent with brand geometry
const CATEGORY_MARK: Record<Achievement["category"], string> = {
  milestone: "◆",
  consistency: "▲",
  accountability: "●",
};

function EarnedBadge({
  achievement,
  isNew,
}: {
  achievement: Achievement;
  isNew: boolean;
}) {
  const mark = CATEGORY_MARK[achievement.category];

  return (
    <div
      className={`border border-[#c9a24d]/35 bg-[#c9a24d]/[0.07] px-4 py-4 flex flex-col gap-2.5 relative overflow-hidden ${isNew ? "milestone-unlock" : ""}`}
      aria-label={`${achievement.title}: earned`}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 w-px h-full bg-[#c9a24d]/40" aria-hidden />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#c9a24d]/80" aria-hidden>{mark}</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/90">
            {achievement.title}
          </p>
        </div>
        <span className="text-[11px] text-emerald-400/90 shrink-0" aria-hidden>✓</span>
      </div>
      <p className="text-[10px] leading-relaxed text-white/50">
        {achievement.description}
      </p>
    </div>
  );
}

function LockedBadge({ achievement }: { achievement: Achievement }) {
  const mark = CATEGORY_MARK[achievement.category];

  return (
    <div
      className="border border-white/[0.05] bg-[#0d0e0f] px-4 py-4 flex flex-col gap-2.5 opacity-20"
      aria-label={`${achievement.title}: locked`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/20" aria-hidden>{mark}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
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
  // IDs of earned milestones not yet acknowledged in the DB.
  // Computed server-side by getDashboardData(); passed as a prop so
  // acknowledgement is account-scoped rather than browser-scoped.
  newlyEarned: string[];
}

export default function AchievementsPanel({ achievements, newlyEarned }: Props) {
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);
  const newlyEarnedSet = new Set(newlyEarned);

  // After the animation completes (1.5s), acknowledge newly-earned milestones
  // in the DB so they never animate again on any device or browser.
  const acknowledged = useRef(false);
  useEffect(() => {
    if (newlyEarned.length === 0 || acknowledged.current) return;
    acknowledged.current = true;

    const t = setTimeout(() => {
      fetch("/api/milestones/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneKeys: newlyEarned }),
      }).catch(() => {
        // Non-critical: if the request fails, the animation will replay
        // on the next page load. Acceptable — server will retry and succeed.
        acknowledged.current = false;
      });
    }, 1600);

    return () => clearTimeout(t);
  // Run once per mount — newlyEarned comes from the server and is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (earned.length === 0 && locked.length === 0) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-white/35 text-sm font-medium mb-1">Nothing yet</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Complete your first workout to unlock your first milestone. Consistency is the only currency here.
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
              <EarnedBadge key={a.id} achievement={a} isNew={newlyEarnedSet.has(a.id)} />
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
