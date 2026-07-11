"use client";

import { useEffect, useRef, useState } from "react";
import type { Mission, PortalStats } from "@/lib/portal/types";

interface Props {
  missions: Mission[];
  stats: PortalStats;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 251.3

export default function MissionProgress({ missions, stats }: Props) {
  const completed = missions.filter((m) => m.status === "completed").length;
  const total = missions.length;
  const notApplicable = missions.filter(
    (m) => m.status === "not-scheduled" || m.status === "locked"
  ).length;
  const applicable = total - notApplicable;
  const allDone = completed >= applicable && applicable > 0;

  const targetDash = applicable > 0 ? (completed / applicable) * CIRCUMFERENCE : 0;

  const [dashFill, setDashFill] = useState(0);
  const [visible, setVisible] = useState(false);
  // Lazy initializer: safe on SSR (window undefined), runs once on client
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false
  );
  const isFirstMount = useRef(true);

  // Fade component in — setTimeout callback is async, not a direct effect setState
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), reducedMotion ? 0 : 500);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  // Ring draw — responds to targetDash changes across scenario switches
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = isFirstMount.current && !reduce ? 250 : 50;
    isFirstMount.current = false;
    const t = setTimeout(() => setDashFill(targetDash), delay);
    return () => clearTimeout(t);
  }, [targetDash]);

  const wrapperStyle: React.CSSProperties = reducedMotion
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease",
        transitionDelay: "0ms",
      };

  const ringTransition: React.CSSProperties = reducedMotion
    ? {}
    : { transition: "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1)" };

  return (
    <div
      style={wrapperStyle}
      className="flex flex-col sm:flex-row items-start gap-8 py-10 border-y border-white/[0.07]"
      aria-label="Today's mission progress and identity stats"
    >
      {/* ── Left column: identity metrics (primary) ─────────── */}
      <div className="flex flex-col gap-7 flex-1 min-w-0">
        {/* Current Streak — dominant */}
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-[0.16em] uppercase mb-2">
            Current Streak
          </p>
          <p className="text-4xl font-bold text-white/95 leading-none tabular-nums">
            {stats.streak}
          </p>
          <p className="text-xs text-white/38 mt-1.5">
            day{stats.streak !== 1 ? "s" : ""} running
          </p>
        </div>

        {/* Promises Kept — with interactive affordance */}
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-[0.16em] uppercase mb-2">
            Promises Kept
          </p>
          <p className="text-4xl font-bold text-white/95 leading-none tabular-nums">
            {stats.lifetimePromises.toLocaleString()}
          </p>
          {/* TODO: Link to promise history page when built */}
          <button
            type="button"
            disabled
            aria-label="View promise history (coming soon)"
            className="mt-2 text-[10px] text-white/22 tracking-[0.08em] cursor-not-allowed hover:text-[#c9a24d]/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a24d]/30 rounded-sm"
          >
            View Promise History →
          </button>
        </div>

        {/* Today's Progress — secondary, visually muted */}
        <div>
          <p className="text-[10px] text-white/22 font-semibold tracking-[0.16em] uppercase mb-2">
            Today&apos;s Progress
          </p>
          <p
            className={`text-2xl font-semibold leading-none tabular-nums ${
              allDone ? "text-[#c9a24d]" : "text-white/45"
            }`}
          >
            {completed} of {applicable}
          </p>
          <p className="text-[10px] text-white/22 mt-1.5">missions complete</p>
        </div>
      </div>

      {/* ── Right column: progress ring (supporting visual) ─── */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div
          className="relative w-[148px] h-[148px]"
          role="img"
          aria-label={`${completed} of ${applicable} missions complete today`}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full -rotate-90"
            aria-hidden
          >
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
            />
            {/* Fill */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={allDone ? "#c9a24d" : "rgba(201,162,77,0.58)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dashFill} ${CIRCUMFERENCE}`}
              style={ringTransition}
            />
          </svg>

          {/* Ring center: streak as identity anchor */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span
              className={`text-[2rem] font-bold leading-none tabular-nums ${
                allDone ? "text-[#c9a24d]" : "text-white/90"
              }`}
            >
              {stats.streak}
            </span>
            <span className="text-[9px] text-white/28 tracking-[0.1em] uppercase leading-none">
              day streak
            </span>
          </div>
        </div>

        {/* Below ring: today's mission count */}
        <p className="text-[10px] text-white/28 text-center tracking-wide tabular-nums">
          {completed} / {total} today
        </p>
      </div>
    </div>
  );
}
