"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst OS — Portal Dashboard (Sprint 6.5)
//
// Hierarchy: Today's Training is the primary focal point.
// Greeting is compact and framing, not competing.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from "react";
import type { DashboardData } from "@/lib/db/portal-dashboard-service";
import MissionEntry from "./MissionEntry";
import PortalShell from "./PortalShell";
import TodayWorkout from "./TodayWorkout";
import PromisesKept from "./PromisesKept";
import WeeklyComplianceCard from "./WeeklyComplianceCard";
import RecoverySnapshotCard from "./RecoverySnapshotCard";
import AchievementsPanel from "./AchievementsPanel";

const ENTRY_DATE_KEY = "catalyst_entry_date";

type Phase = "entry" | "portal";
type TodayKind = "workout" | "rest_day" | "no_program" | "program_complete" | "not_started";

interface Props {
  clientName: string;
  dashboardData: DashboardData;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const CONTEXT: Record<TodayKind | "loading", string> = {
  workout: "Your session is programmed and ready. One focused hour compounds into the result your future self will thank you for.",
  rest_day: "Rest is a training variable, not a day off. Protect your sleep, hit your protein targets, and move lightly.",
  no_program: "Your coach is finalizing your training block. Use this time to dial in your sleep schedule and nutrition baseline.",
  program_complete: "Phase complete. The habits you built don't stop here — your coach will have your next block ready soon.",
  not_started: "Your program launches on your start date. Prepare your environment and show up ready to execute.",
  loading: "Stay consistent today. Every promise kept builds the result your coach is tracking.",
};

// ─── Section Labels ───────────────────────────────────────────
// Primary: gold tint — used for Today's Training only
// Standard: muted gray — used for supporting sections

function PrimaryLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-px h-3 bg-[#c9a24d]/50" aria-hidden />
      <p className="text-[9px] text-[#c9a24d]/60 uppercase tracking-[0.45em] font-semibold">
        {children}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] font-semibold mb-3">
      {children}
    </p>
  );
}

// ─── Dashboard Greeting ──────────────────────────────────────

function DashboardGreeting({
  clientName,
  todayKind,
}: {
  clientName: string;
  todayKind: TodayKind | null;
}) {
  const firstName = clientName.split(" ")[0];
  const greeting = getGreeting();
  const context = CONTEXT[todayKind ?? "loading"];

  return (
    <div>
      <div className="w-5 h-[2px] bg-[#c9a24d] mb-3" aria-hidden />
      <p
        className="font-headline uppercase tracking-[0.06em] text-white leading-none"
        style={{ fontSize: "clamp(1.35rem, 4.5vw, 2rem)" }}
      >
        {greeting}, {firstName}.
      </p>
      <p className="text-sm text-white/45 leading-relaxed mt-3 max-w-lg">{context}</p>
    </div>
  );
}

// ─── Portal Dashboard ────────────────────────────────────────

export default function PortalDashboard({ clientName, dashboardData }: Props) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [todayKind, setTodayKind] = useState<TodayKind | null>(null);

  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
  );

  useEffect(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    const lastShown = localStorage.getItem(ENTRY_DATE_KEY);
    requestAnimationFrame(() => {
      if (lastShown === todayKey) setPhase("portal");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    fetch("/api/portal/today-workout")
      .then((r) => r.json())
      .then((d: { ok: boolean; result?: { kind: TodayKind } }) => {
        if (d.ok && d.result) setTodayKind(d.result.kind);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (phase === "portal") {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => setMounted(false));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  function handleEntryComplete() {
    const todayKey = new Date().toLocaleDateString("en-CA");
    localStorage.setItem(ENTRY_DATE_KEY, todayKey);
    setPhase("portal");
  }

  function fadeIn(index: number): CSSProperties {
    if (reducedMotion) return {};
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(0.5rem)",
      transition: "opacity 280ms ease, transform 280ms ease",
      transitionDelay: `${index * 50 + 80}ms`,
    };
  }

  if (!ready) return null;

  return (
    <>
      {phase === "entry" && (
        <MissionEntry
          clientName={clientName}
          scenario="default"
          onComplete={handleEntryComplete}
        />
      )}

      {phase === "portal" && (
        <PortalShell clientName={clientName}>
          {/* 1. Compact greeting — frames the day, does not dominate */}
          <div style={fadeIn(0)}>
            <DashboardGreeting clientName={clientName} todayKind={todayKind} />
          </div>

          {/* 2. Today's Training — PRIMARY focus with gold accent label */}
          <div style={fadeIn(1)}>
            <PrimaryLabel>Today&apos;s Training</PrimaryLabel>
            <TodayWorkout />
          </div>

          {/* 3. Promises Kept */}
          <div style={fadeIn(2)}>
            <SectionLabel>Promises Kept</SectionLabel>
            <PromisesKept stats={dashboardData.promises} />
          </div>

          {/* 4. This Week */}
          <div style={fadeIn(3)}>
            <SectionLabel>This Week</SectionLabel>
            <WeeklyComplianceCard data={dashboardData.weeklyCompliance} />
          </div>

          {/* 5. Recovery — only when check-in data exists */}
          {dashboardData.recovery.hasData && (
            <div style={fadeIn(4)}>
              <SectionLabel>Recovery</SectionLabel>
              <RecoverySnapshotCard data={dashboardData.recovery} />
            </div>
          )}

          {/* 6. Achievements */}
          <div style={fadeIn(5)}>
            <SectionLabel>Achievements</SectionLabel>
            <AchievementsPanel achievements={dashboardData.achievements} />
          </div>
        </PortalShell>
      )}
    </>
  );
}
