"use client";

import type { ProgressData, BodyMetricEntry, WeeklySessionCount } from "@/lib/db/portal-dashboard-service";

// ─── Sparkline ───────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 96;
  const H = 36;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - 4 - ((v - min) / range) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastY = H - 4 - ((values[values.length - 1] - min) / range) * (H - 8);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      className="overflow-visible shrink-0"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#c9a24d"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx={W} cy={lastY} r="2.5" fill="#c9a24d" opacity="0.9" />
    </svg>
  );
}

// ─── Body Metric Card ─────────────────────────────────────────

function BodyMetricCard({
  label,
  unit,
  values,
  entries,
}: {
  label: string;
  unit: string;
  values: number[];
  entries: { weekLabel: string; value: number }[];
}) {
  if (values.length === 0) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-3">{label}</p>
        <p className="text-white/40 text-sm font-medium mb-1">Tracking starts with check-ins</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Submit weekly check-ins with your {label.toLowerCase()} measurement to build your trend chart here.
        </p>
      </div>
    );
  }

  const current = values[0];
  const first = values[values.length - 1];
  const delta = current - first;
  const isPositive = delta > 0;
  const deltaStr =
    delta === 0
      ? "No change from start"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${unit} from start`;

  // For body metrics, down is generally improvement (weight/waist)
  const isImprovement = delta < 0;

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f]">
      <div className="px-5 pt-5 pb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-1.5">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-white tabular-nums">{current.toFixed(1)}</p>
            <p className="text-[10px] text-white/35 ml-0.5">{unit}</p>
          </div>
          <p
            className={`text-[10px] mt-1.5 tabular-nums ${
              delta === 0
                ? "text-white/30"
                : isImprovement
                  ? "text-emerald-400"
                  : isPositive
                    ? "text-amber-400"
                    : "text-white/30"
            }`}
          >
            {deltaStr}
          </p>
        </div>
        {values.length >= 2 && <Sparkline values={[...values].reverse()} />}
      </div>

      {entries.length > 0 && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
          {entries.slice(0, 4).map((e) => (
            <div key={e.weekLabel} className="px-5 py-2 flex items-center justify-between">
              <p className="text-[10px] text-white/35">{e.weekLabel}</p>
              <p className="text-[10px] text-white/65 font-medium tabular-nums">
                {e.value.toFixed(1)} {unit}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consistency Chart ────────────────────────────────────────

function ConsistencyChart({ weeks }: { weeks: WeeklySessionCount[] }) {
  if (weeks.length === 0) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-white/40 text-sm font-medium mb-1">Your consistency map starts here</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Log your first workout to begin tracking your weekly session pattern. Each bar represents one week of work.
        </p>
      </div>
    );
  }

  const maxCompleted = Math.max(...weeks.map((w) => w.completed), 1);

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-5">
      <div className="flex items-end gap-1" style={{ height: 64 }}>
        {[...weeks].reverse().map((w) => {
          const heightPct = (w.completed / maxCompleted) * 100;
          return (
            <div
              key={w.weekStartDate}
              className="flex-1 flex flex-col items-center justify-end"
              title={`${w.weekLabel}: ${w.completed} of ${w.total} sessions`}
              aria-label={`${w.weekLabel}: ${w.completed} sessions`}
            >
              <div
                className={`w-full transition-all ${
                  w.completed > 0 ? "bg-[#c9a24d]/55" : "bg-white/[0.05]"
                }`}
                style={{ height: `${Math.max(3, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2.5">
        <p className="text-[9px] text-white/20">{[...weeks].reverse()[0]?.weekLabel}</p>
        <p className="text-[9px] text-white/20">{weeks[0]?.weekLabel}</p>
      </div>
    </div>
  );
}

// ─── Recovery Trend ───────────────────────────────────────────

function RecoveryTrend({ metrics }: { metrics: BodyMetricEntry[] }) {
  const withSleep = metrics.filter((m) => m.sleep !== null);
  const withStress = metrics.filter((m) => m.stress !== null);
  const withEnergy = metrics.filter((m) => m.energy !== null);

  if (withSleep.length === 0 && withStress.length === 0 && withEnergy.length === 0) {
    return (
      <div className="border border-white/[0.07] bg-[#0d0e0f] px-5 py-6">
        <p className="text-white/40 text-sm font-medium mb-1">Recovery trends need check-in data</p>
        <p className="text-gray-600 text-xs leading-relaxed">
          Submit check-ins with sleep, stress, and energy ratings each week. Your trends will appear here automatically.
        </p>
      </div>
    );
  }

  const avgSleep =
    withSleep.length > 0
      ? withSleep.reduce((s, m) => s + (m.sleep ?? 0), 0) / withSleep.length
      : null;
  const avgStress =
    withStress.length > 0
      ? withStress.reduce((s, m) => s + (m.stress ?? 0), 0) / withStress.length
      : null;
  const avgEnergy =
    withEnergy.length > 0
      ? withEnergy.reduce((s, m) => s + (m.energy ?? 0), 0) / withEnergy.length
      : null;

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f] grid grid-cols-3 divide-x divide-white/[0.06]">
      {[
        { label: "Avg Sleep", value: avgSleep !== null ? `${avgSleep.toFixed(1)}h` : "—" },
        { label: "Avg Stress", value: avgStress !== null ? `${avgStress.toFixed(1)}/10` : "—" },
        { label: "Avg Energy", value: avgEnergy !== null ? `${avgEnergy.toFixed(1)}/10` : "—" },
      ].map((item) => (
        <div key={item.label} className="px-4 py-5 text-center">
          <p className="text-base font-bold text-white/80 tabular-nums">{item.value}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em] mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface Props {
  data: ProgressData;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] font-semibold mb-3">
      {children}
    </p>
  );
}

export default function ProgressContent({ data }: Props) {
  const weightValues = data.bodyMetrics
    .map((m) => m.weightLbs)
    .filter((v): v is number => v !== null);
  const waistValues = data.bodyMetrics
    .map((m) => m.waistInches)
    .filter((v): v is number => v !== null);

  const weightEntries = data.bodyMetrics
    .filter((m) => m.weightLbs !== null)
    .map((m) => ({ weekLabel: m.weekLabel, value: m.weightLbs! }));
  const waistEntries = data.bodyMetrics
    .filter((m) => m.waistInches !== null)
    .map((m) => ({ weekLabel: m.weekLabel, value: m.waistInches! }));

  return (
    <div className="space-y-10">
      {/* Body Metrics */}
      <div>
        <SectionLabel>Body Metrics</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BodyMetricCard
            label="Weight"
            unit="lbs"
            values={weightValues}
            entries={weightEntries}
          />
          <BodyMetricCard
            label="Waist"
            unit="in"
            values={waistValues}
            entries={waistEntries}
          />
        </div>
      </div>

      {/* Workout Consistency */}
      <div>
        <SectionLabel>Workout Consistency</SectionLabel>
        <ConsistencyChart weeks={data.weeklySessionCounts} />
      </div>

      {/* Recovery Trends — only render if meaningful data present */}
      {data.bodyMetrics.length > 0 && (
        <div>
          <SectionLabel>Recovery Trends</SectionLabel>
          <RecoveryTrend metrics={data.bodyMetrics} />
        </div>
      )}
    </div>
  );
}
