import Link from "next/link";
import type { RecoverySnapshot } from "@/lib/db/portal-dashboard-service";

interface Props {
  data: RecoverySnapshot;
}

function sleepLabel(h: number): { text: string; color: string } {
  if (h >= 8) return { text: "Excellent", color: "text-emerald-400/80" };
  if (h >= 7) return { text: "Good", color: "text-emerald-400/60" };
  if (h >= 6) return { text: "Fair", color: "text-amber-400/70" };
  return { text: "Low", color: "text-red-400/60" };
}

function energyLabel(score: number): { text: string; color: string } {
  if (score >= 8) return { text: "High", color: "text-emerald-400/80" };
  if (score >= 6) return { text: "Good", color: "text-emerald-400/60" };
  if (score >= 4) return { text: "Fair", color: "text-amber-400/70" };
  return { text: "Low", color: "text-red-400/60" };
}

function stressLabel(score: number): { text: string; color: string } {
  if (score <= 3) return { text: "Low", color: "text-emerald-400/80" };
  if (score <= 5) return { text: "Manageable", color: "text-emerald-400/60" };
  if (score <= 7) return { text: "Elevated", color: "text-amber-400/70" };
  return { text: "High", color: "text-red-400/60" };
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline
        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.79A2.5 2.5 0 0 1 4 12a2.5 2.5 0 0 1 1.5-2.27A2.5 2.5 0 0 1 9.5 2z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.79A2.5 2.5 0 0 0 20 12a2.5 2.5 0 0 0-1.5-2.27A2.5 2.5 0 0 0 14.5 2z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function buildInterpretation(
  sleep: number | null,
  energy: number | null,
  stress: number | null,
): string | null {
  if (stress !== null && stress >= 7) return "Stress is elevated. Prioritize recovery today.";
  if (energy !== null && energy <= 3) return "Energy is low. Rest is training too.";
  if (sleep !== null && sleep < 6) return "Sleep is a factor. Target 7+ hours tonight.";
  if (stress !== null && stress <= 3 && energy !== null && energy >= 7) return "Recovery markers are strong.";
  return null;
}

export default function RecoverySnapshotCard({ data }: Props) {
  if (!data.hasData) return null;

  const interpretation = buildInterpretation(data.sleep, data.energy, data.stress);

  const metrics = [
    data.sleep !== null && {
      icon: <MoonIcon />,
      iconColor: "text-violet-400/75",
      value: `${data.sleep}h`,
      label: "Sleep",
      badge: sleepLabel(data.sleep),
    },
    data.energy !== null && {
      icon: <BoltIcon />,
      iconColor: "text-amber-400/75",
      value: `${data.energy}/10`,
      label: "Energy",
      badge: energyLabel(data.energy),
    },
    data.stress !== null && {
      icon: <BrainIcon />,
      iconColor: "text-rose-400/70",
      value: `${data.stress}/10`,
      label: "Stress",
      badge: stressLabel(data.stress),
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    iconColor: string;
    value: string;
    label: string;
    badge: { text: string; color: string };
  }[];

  if (metrics.length === 0) return null;

  return (
    <div className="bg-[#0d0e0f] border border-white/[0.07] p-5 flex flex-col gap-4">
      <p className="text-[9px] text-white/22 uppercase tracking-[0.45em]">
        Recovery Snapshot
      </p>

      {/* Metrics — icons + values + qualitative labels */}
      <div className="flex items-start justify-between gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex-1 flex flex-col items-center gap-2 text-center">
            <span className={m.iconColor}>{m.icon}</span>
            <p className="text-white text-base font-bold tabular-nums leading-none">{m.value}</p>
            <p className="text-[9px] text-white/25 uppercase tracking-[0.15em]">{m.label}</p>
            <p className={`text-[9px] font-medium ${m.badge.color}`}>{m.badge.text}</p>
          </div>
        ))}
      </div>

      {/* Interpretation — only when notable */}
      {interpretation && (
        <p className="text-[10px] text-white/30 leading-snug border-t border-white/[0.04] pt-3">
          {interpretation}
        </p>
      )}

      {/* Footer — last check-in date */}
      {data.weekLabel && (
        <div className={`flex items-center justify-between pt-3 ${interpretation ? "" : "border-t border-white/[0.04]"}`}>
          <p className="text-[9px] text-white/18">Last check-in · {data.weekLabel}</p>
          <Link
            href="/portal/check-ins"
            className="text-[9px] text-white/25 hover:text-white/50 uppercase tracking-[0.2em] transition-colors"
          >
            View →
          </Link>
        </div>
      )}
    </div>
  );
}
