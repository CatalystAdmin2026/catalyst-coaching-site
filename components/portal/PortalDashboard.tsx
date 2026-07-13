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
import MissionTile from "./MissionTile";
import MissionProgress from "./MissionProgress";
import MissionDebrief from "./MissionDebrief";
import TodayWorkout from "./TodayWorkout";
import WorkoutHistory from "./WorkoutHistory";
import { getScenarioData } from "@/lib/portal/mockData";
import type { PortalScenario } from "@/lib/portal/types";

const ENTRY_DATE_KEY = "catalyst_entry_date";
const LIVE_SCENARIO: PortalScenario = "default";

type Phase = "entry" | "portal";

interface Props {
  clientName: string;
}

export default function PortalDashboard({ clientName }: Props) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [ready, setReady] = useState(false); // prevents SSR flash
  const [portalMounted, setPortalMounted] = useState(false);

  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
  );

  // On first client render: check if entry was already shown today.
  // localStorage read must be async (requestAnimationFrame callback) to
  // satisfy the react-hooks/set-state-in-effect lint rule — same pattern
  // used by portal-preview for setPortalReady.
  useEffect(() => {
    const todayKey = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local date
    const lastShown = localStorage.getItem(ENTRY_DATE_KEY);
    requestAnimationFrame(() => {
      if (lastShown === todayKey) setPhase("portal");
      setReady(true);
    });
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

  // TODO Sprint 5B.5: Replace mock data with real mission data
  // fetched for this client's active enrollment.
  // The clientName prop already comes from the real database.
  const data = getScenarioData(LIVE_SCENARIO);
  // Override the hardcoded mock client name with the real authenticated name
  const liveData = { ...data, clientName };

  const allComplete = liveData.missions.every(
    (m) =>
      m.status === "completed" ||
      m.status === "not-scheduled" ||
      m.status === "locked",
  );

  function tileStyle(index: number): CSSProperties {
    if (reducedMotion) return {};
    return {
      opacity: portalMounted ? 1 : 0,
      transform: portalMounted ? "none" : "translateY(1rem)",
      transition: "opacity 350ms ease, transform 350ms ease",
      transitionDelay: `${index * 60 + 160}ms`,
    };
  }

  // Prevent rendering anything until we've read localStorage to avoid
  // showing the entry screen briefly before skipping it.
  if (!ready) return null;

  return (
    <>
      {/* ── Mission Entry Experience ───────────────────────── */}
      {phase === "entry" && (
        <MissionEntry
          clientName={liveData.clientName}
          scenario={LIVE_SCENARIO}
          onComplete={handleEntryComplete}
        />
      )}

      {/* ── Portal Dashboard ───────────────────────────────── */}
      {phase === "portal" && (
        <PortalShell clientName={liveData.clientName}>
          {/* 1. Hero briefing (live — no hardcoded scenario copy) */}
          <LiveMissionBriefing clientName={liveData.clientName} />

          {/* 2. Mission tiles */}
          {/* TODO Sprint 5B.5: Replace with real daily missions */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            aria-label="Today's missions"
          >
            {liveData.missions.map((mission, i) => (
              <div key={mission.id} style={tileStyle(i)}>
                <MissionTile mission={mission} />
              </div>
            ))}
          </div>

          {/* 3. Today's workout */}
          <div style={tileStyle(liveData.missions.length)}>
            <div className="mb-1">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-semibold mb-3">
                Today&apos;s Training
              </p>
              <TodayWorkout />
            </div>
          </div>

          {/* 4. Identity metrics + progress ring */}
          {/* TODO Sprint 5B.5: Replace with real streak and promise count */}
          <MissionProgress
            missions={liveData.missions}
            stats={liveData.stats}
          />

          {/* 5. Workout history */}
          <div style={tileStyle(liveData.missions.length + 1)}>
            <div className="mb-1">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.5em] font-semibold mb-3">
                Training History
              </p>
              <WorkoutHistory />
            </div>
          </div>

          {/* 6. Coach debrief */}
          {/* TODO Sprint 5B.5: Replace with AI-generated debrief */}
          {!allComplete && (
            <MissionDebrief
              scenario={LIVE_SCENARIO}
              missions={liveData.missions}
            />
          )}
        </PortalShell>
      )}
    </>
  );
}
