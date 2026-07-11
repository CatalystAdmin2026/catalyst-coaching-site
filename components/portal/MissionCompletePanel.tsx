import type { PortalStats } from "@/lib/portal/types";

interface Props {
  stats: PortalStats;
  clientName: string;
}

// One daily message rotated by streak mod to feel varied but not random
const DAILY_MESSAGES = [
  "Discipline compounds quietly.",
  "The process is working.",
  "Excellence is a habit.",
  "The standard is maintained.",
  "This is what commitment looks like.",
];

export default function MissionCompletePanel({ stats, clientName }: Props) {
  const firstName = clientName.split(" ")[0];
  const dailyMessage = DAILY_MESSAGES[stats.streak % DAILY_MESSAGES.length];

  return (
    <div className="w-full border border-[#c9a24d]/20 bg-[#c9a24d]/[0.04] rounded-sm px-6 pt-8 pb-8 flex flex-col gap-6">
      {/* Headline */}
      <div className="flex flex-col gap-2">
        {/* Gold overline */}
        <div className="w-6 h-[2px] bg-[#c9a24d]/60" aria-hidden />
        <h2 className="font-headline text-4xl md:text-5xl uppercase tracking-[0.06em] text-[#c9a24d] leading-none">
          Mission<br />Complete
        </h2>
        <p className="text-sm text-white/50 mt-1 max-w-sm leading-relaxed">
          Today&apos;s promises were kept.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-start gap-8 pt-4 border-t border-[#c9a24d]/12">
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-[0.14em] uppercase mb-1.5">
            Current Streak
          </p>
          <p className="text-3xl font-bold text-white/90 tabular-nums">{stats.streak}</p>
          <p className="text-[10px] text-white/30 mt-1">days</p>
        </div>
        <div className="w-px self-stretch bg-[#c9a24d]/12" />
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-[0.14em] uppercase mb-1.5">
            Lifetime
          </p>
          <p className="text-3xl font-bold text-white/90 tabular-nums">
            {stats.lifetimePromises.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30 mt-1">promises kept</p>
        </div>
      </div>

      {/* Daily message + supporting line */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.05]">
        <p className="text-sm text-white/55 font-medium italic">
          &ldquo;{dailyMessage}&rdquo;
        </p>
        <p className="text-xs text-white/28 leading-relaxed max-w-sm">
          You honored every commitment you made to yourself today, {firstName}. Rest well.
        </p>
      </div>
    </div>
  );
}
