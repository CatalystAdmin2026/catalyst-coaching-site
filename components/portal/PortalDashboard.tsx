"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst OS — Live Portal Dashboard
//
// Client component wrapper for the authenticated /portal route.
// Receives server-resolved identity data and manages the
// mission-entry → portal-dashboard phase transition.
//
// Mission Entry frequency: once per calendar day (UTC-local date).
// Choice: localStorage with a date key in YYYY-MM-DD format.
// Rationale: simpler and more appropriate than a session-scoped flag
// because clients return daily and should see the entry each new day,
// but not on every page navigation within the same day.
//
// The entry key ('catalyst_entry_date') is local to this browser.
// Clearing localStorage or opening a new browser resets it, which
// is intentional and correct for a daily coaching ritual.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from "react";
import MissionEntry from "./MissionEntry";
import PortalShell from "./PortalShell";
import LiveMissionBriefing from "./LiveMissionBriefing";
import TodayWorkout from "./TodayWorkout";
import WorkoutHistory from "./WorkoutHistory";

const ENTRY_DATE_KEY = "catalyst_entry_date";

type Phase = "entry" | "portal";
type TodayKind = "workout" | "rest_day" | "no_program" | "program_complete" | "not_started";

interface Props {
  clientName: string;
}

// ─── TRAINING MISSION CARD ───────────────────────────────────

const MISSION_COPY: Record<TodayKind | "loading", { title: string; body: string }> = {
  workout: {
    title: "Complete Today's Workout",
    body: "Your session is programmed and ready — execute.",
  },
  rest_day: {
    title: "Recover with Intent",
    body: "Prioritize sleep, nutrition, and mobility. Rest is part of the program.",
  },
  no_program: {
    title: "Program Incoming",
    body: "Your coach is finalizing your training block. Check back soon.",
  },
  program_complete: {
    title: "Phase Complete",
    body: "Outstanding work. Your coach will assign your next training block.",
  },
  not_started: {
    title: "Program Starts Soon",
    body: "Your training kicks off on your start date. Prepare your environment.",
  },
  loading: {
    title: "Loading…",
    body: "",
  },
};

function TrainingMissionCard({
  kind,
  style,
}: {
  kind: TodayKind | null;
  style?: CSSProperties;
}) {
  const copy = MISSION_COPY[kind ?? "loading"];

  return (
    <div className="border border-[#C9A24D]/20 bg-[#0a0b0c] p-5" style={style}>
      <div className="w-6 h-[2px] bg-[#C9A24D] mb-3" aria-hidden />
      <p className="text-white font-bold text-sm mb-1">{copy.title}</p>
      {copy.body && (
        <p className="text-gray-500 text-xs leading-relaxed">{copy.body}</p>
      )}
    </div>
  );
}

// ─── PORTAL DASHBOARD ────────────────────────────────────────

export default function PortalDashboard({ clientName }: Props) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [ready, setReady] = useState(false); // prevents SSR flash
  const [portalMounted, setPortalMounted] = useState(false);
  const [todayKind, setTodayKind] = useState<TodayKind | null>(null);

  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
  );

  // On first client render: check if entry was already shown today.
  useEffect(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    const lastShown = localStorage.getItem(ENTRY_DATE_KEY);
    requestAnimationFrame(() => {
      if (lastShown === todayKey) setPhase("portal");
      setReady(true);
    });
  }, []);

  // Fetch today's workout kind for briefing and mission card.
  useEffect(() => {
    fetch("/api/portal/today-workout")
      .then((r) => r.json())
      .then((d: { ok: boolean; result?: { kind: TodayKind } }) => {
        if (d.ok && d.result) setTodayKind(d.result.kind);
      })
      .catch(() => {});
  }, []);

  // Trigger entrance animations after portal phase begins.
  useEffect(() => {
    if (phase === "portal") {
      requestAnimationFrame(() => setPortalMounted(true));
    } else {
      requestAnimationFrame(() => setPortalMounted(false));
    }
  }, [phase]);

  function handleEntryComplete() {
    const todayKey = new Date().toLocaleDateString("en-CA");
    localStorage.setItem(ENTRY_DATE_KEY, todayKey);
    setPhase("portal");
  }

  function tileStyle(index: number): CSSProperties {
    if (reducedMotion) return {};
    return {
      opacity: portalMounted ? 1 : 0,
      transform: portalMounted ? "none" : "translateY(1rem)",
      transition: "opacity 350ms ease, transform 350ms ease",
      transitionDelay: `${index * 60 + 160}ms`,
    };
  }

  if (!ready) return null;

  return (
    <>
      {/* ── Mission Entry Experience ───────────────────────── */}
      {phase === "entry" && (
        <MissionEntry
          clientName={clientName}
          scenario="default"
          onComplete={handleEntryComplete}
        />
      )}

      {/* ── Portal Dashboard ───────────────────────────────── */}
      {phase === "portal" && (
        <PortalShell clientName={clientName}>
          {/* 1. Hero briefing — context-aware, no AI */}
          <LiveMissionBriefing clientName={clientName} todayKind={todayKind} />

          {/* 2. Training mission — real state, no mock tiles */}
          <TrainingMissionCard kind={todayKind} style={tileStyle(0)} />

          {/* 3. Today's workout */}
          <div style={tileStyle(1)}>
            <div className="mb-1">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-semibold mb-3">
                Today&apos;s Training
              </p>
              <TodayWorkout />
            </div>
          </div>

          {/* 4. Workout history */}
          <div style={tileStyle(2)}>
            <div className="mb-1">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-semibold mb-3">
                Training History
              </p>
              <WorkoutHistory />
            </div>
          </div>
        </PortalShell>
      )}
    </>
  );
}
