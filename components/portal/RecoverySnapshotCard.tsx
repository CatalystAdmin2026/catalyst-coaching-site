import type { RecoverySnapshot } from "@/lib/db/portal-dashboard-service";

interface Props {
  data: RecoverySnapshot;
}

// Horizontal bar indicator — clearer than ring gauges for at-a-glance reading.
// scale: 0–24 for sleep, 1–10 for others
function MetricBar({
  label,
  value,
  max,
  unit,
  invert = false,
}: {
  label: string;
  value: number | null;
  max: number;
  unit: string;
  invert?: boolean;
}) {
  const pct = value !== null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  // Color: inverted metrics (stress) are worse when high
  let barColor = "bg-[#c9a24d]/50";
  if (value !== null && !invert) {
    if (pct >= 70) barColor = "bg-emerald-500/50";
    else if (pct >= 40) barColor = "bg-[#c9a24d]/50";
    else barColor = "bg-red-500/40";
  } else if (value !== null && invert) {
    if (pct <= 40) barColor = "bg-emerald-500/50";
    else if (pct <= 70) barColor = "bg-[#c9a24d]/50";
    else barColor = "bg-red-500/40";
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em] w-14 shrink-0">
        {label}
      </p>
      <div className="flex-1 h-1 bg-white/[0.06] relative overflow-hidden">
        {value !== null && (
          <div
            className={`absolute left-0 top-0 h-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <p className="text-white/70 text-xs font-medium tabular-nums w-14 text-right shrink-0">
        {value !== null ? `${value}${unit}` : "—"}
      </p>
    </div>
  );
}

export default function RecoverySnapshotCard({ data }: Props) {
  if (!data.hasData) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-white/35 text-sm font-medium mb-1">Recovery tracking begins with check-ins</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Submit a weekly check-in with your sleep, stress, and energy data. Your recovery pattern will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f]">
      <div className="px-5 pt-4 pb-1">
        <MetricBar label="Sleep" value={data.sleep} max={10} unit="h" />
        <MetricBar label="Energy" value={data.energy} max={10} unit="/10" />
        <MetricBar label="Stress" value={data.stress} max={10} unit="/10" invert />
      </div>
      {data.weekLabel && (
        <div className="px-5 py-2.5 border-t border-white/[0.06] mt-1">
          <p className="text-[9px] text-gray-600">
            Last check-in · Week of {data.weekLabel}
          </p>
        </div>
      )}
    </div>
  );
}
