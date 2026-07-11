"use client";

import {
  Activity,
  Check,
  ClipboardList,
  Droplets,
  Dumbbell,
  Lock,
  Minus,
  Moon,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Mission, MissionType } from "@/lib/portal/types";

const TYPE_ICONS: Record<MissionType, LucideIcon> = {
  workout:    Dumbbell,
  nutrition:  Utensils,
  water:      Droplets,
  steps:      Activity,
  sleep:      Moon,
  "check-in": ClipboardList,
};

// Shown beneath "Promise Kept" on completed tiles — mature, earned tone
const COMPLETED_PAYOFFS: Record<MissionType, string> = {
  workout:    "Quiet work. Real progress.",
  nutrition:  "You honored the plan.",
  water:      "Consistency compounds.",
  steps:      "Another vote cast.",
  sleep:      "Recovery is training.",
  "check-in": "One promise stronger.",
};

interface Props {
  mission: Mission;
}

export default function MissionTile({ mission }: Props) {
  const { status, type, title, subtitle, target, current, unit, actionLabel } = mission;
  const Icon = TYPE_ICONS[type];

  const isCompleted    = status === "completed";
  const isInProgress   = status === "in-progress";
  const isLocked       = status === "locked";
  const isNotScheduled = status === "not-scheduled";
  const isOverdue      = status === "overdue";
  const isNotStarted   = status === "not-started";

  const hasProgress = isInProgress && target != null && current != null && target > 0;
  const progressPct = hasProgress
    ? Math.min(100, Math.round(((current ?? 0) / (target ?? 1)) * 100))
    : 0;

  /* ── Card outer styles ─────────────────────────── */
  let cardCls =
    "relative flex flex-col gap-4 p-6 transition-all duration-300 rounded-sm border ";
  if (isCompleted) {
    cardCls +=
      "bg-[#1f2326] border-t-2 border-t-[#c9a24d] border-x-[#c9a24d]/15 border-b-[#c9a24d]/15 shadow-[0_0_28px_rgba(201,162,77,0.07)]";
  } else if (isInProgress) {
    cardCls +=
      "bg-[#1f2326] border-[#c9a24d]/15 border-l-2 border-l-[#c9a24d]/55";
  } else if (isOverdue) {
    cardCls +=
      "bg-[#1f2326] border-white/[0.07] border-l-2 border-l-amber-500/45";
  } else if (isLocked || isNotScheduled) {
    cardCls += "bg-[#181b1e] border-white/[0.04] opacity-45";
  } else {
    cardCls += "bg-[#1f2326] border-white/[0.07]";
  }

  /* ── Icon tint ─────────────────────────────────── */
  let iconTint = "text-white/35";
  if (isCompleted)  iconTint = "text-[#c9a24d]";
  else if (isInProgress) iconTint = "text-white/65";
  else if (isOverdue)    iconTint = "text-amber-400/65";

  const payoff = COMPLETED_PAYOFFS[type];

  return (
    <div className={cardCls}>
      {/* Header: icon + status badge */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${iconTint}`}>
          {isLocked
            ? <Lock size={15} className="text-white/20" />
            : isNotScheduled
            ? <Minus size={15} className="text-white/20" />
            : <Icon size={18} />
          }
        </div>

        {/* Status badge */}
        {isCompleted && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-[#c9a24d] text-[10px] font-semibold tracking-[0.12em] uppercase">
              <Check size={9} strokeWidth={3} />
              Promise Kept
            </span>
          </div>
        )}
        {isOverdue && (
          <span className="flex items-center gap-1 text-amber-400/65 text-[10px] font-semibold tracking-[0.12em] uppercase">
            <AlertTriangle size={9} strokeWidth={2.5} />
            Yesterday
          </span>
        )}
        {isNotScheduled && (
          <span className="text-white/20 text-[10px] font-semibold tracking-[0.12em] uppercase">
            Rest
          </span>
        )}
        {isLocked && (
          <span className="text-white/18 text-[10px] font-semibold tracking-[0.12em] uppercase">
            Locked
          </span>
        )}
      </div>

      {/* Title + subtitle + completed payoff */}
      <div className="flex flex-col gap-1">
        <p
          className={`text-sm font-semibold leading-snug ${
            isLocked || isNotScheduled
              ? "text-white/25"
              : "text-white/88"
          }`}
        >
          {title}
        </p>
        <p
          className={`text-xs leading-relaxed ${
            isLocked || isNotScheduled ? "text-white/18" : "text-white/42"
          }`}
        >
          {subtitle}
        </p>
        {isCompleted && (
          <p className="text-[10px] text-[#c9a24d]/55 mt-0.5 italic">{payoff}</p>
        )}
      </div>

      {/* Progress bar — in-progress missions with numeric target */}
      {hasProgress && (
        <div className="flex flex-col gap-1.5">
          <div className="h-[3px] w-full bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a24d]/65 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-white/38 tabular-nums">
            {current?.toLocaleString()} / {target?.toLocaleString()} {unit}
          </p>
        </div>
      )}

      {/* Action button */}
      {(isNotStarted || isInProgress || isOverdue) &&
        !isLocked &&
        !isNotScheduled &&
        actionLabel && (
          <button
            type="button"
            className={`mt-auto w-full py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors rounded-sm min-h-[44px] ${
              isInProgress
                ? "bg-[#c9a24d] text-black hover:bg-[#d4b56a]"
                : isOverdue
                ? "bg-amber-500/12 text-amber-400/75 border border-amber-500/18 hover:bg-amber-500/20"
                : "bg-white/[0.04] text-white/52 border border-white/8 hover:bg-white/[0.07] hover:text-white/72"
            }`}
          >
            {/* Arrow only on the primary (in-progress) action */}
            {isInProgress ? `${actionLabel} →` : actionLabel}
          </button>
        )}
    </div>
  );
}
