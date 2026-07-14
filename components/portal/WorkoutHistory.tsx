"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface HistorySession {
  id: string;
  workoutName: string;
  scheduledDate: string | null;
  completedAt: string | null;
  status: string;
  completionPercent: number;
  programWeekNumber: number | null;
  clientNotes: string | null;
  sectionCount: number;
  exerciseCount: number;
}

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/portal/workout-history?limit=10")
      .then((r) => r.json())
      .then((data: { ok: boolean; sessions?: HistorySession[] }) => {
        if (!mounted) return;
        if (data.ok && data.sessions) setSessions(data.sessions);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="border border-dashed border-white/[0.06] px-5 py-6 text-center">
        <p className="text-gray-400 text-sm">No completed workouts yet</p>
        <p className="text-gray-500 text-xs mt-1">Your workout history will appear here after your first session.</p>
      </div>
    );
  }

  const displaySessions = expanded ? sessions : sessions.slice(0, 5);

  function fmtDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function statusDot(status: string) {
    if (status === "completed") return "bg-emerald-400";
    if (status === "skipped") return "bg-gray-500";
    return "bg-amber-400";
  }

  return (
    <div>
      <div className="space-y-1.5">
        {displaySessions.map((s) => (
          <Link
            key={s.id}
            href={`/portal/history/${s.id}`}
            className="bg-[#0d0e0f] border border-white/[0.05] px-4 py-3 flex items-center gap-4 hover:border-white/[0.12] hover:bg-[#101213] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a24d]/50 block"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(s.status)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{s.workoutName}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-gray-400 text-[10px]">
                  {s.completedAt ? fmtDate(s.completedAt) : fmtDate(s.scheduledDate)}
                </span>
                {s.programWeekNumber && (
                  <span className="text-gray-500 text-[10px]">Week {s.programWeekNumber}</span>
                )}
                <span className="text-gray-500 text-[10px]">
                  {s.exerciseCount} exercises
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-bold ${s.completionPercent >= 80 ? "text-emerald-400" : s.completionPercent >= 50 ? "text-amber-400" : "text-gray-500"}`}>
                {s.completionPercent}%
              </p>
              <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em]">done</p>
            </div>
            <div className="shrink-0 text-gray-500 text-[10px] hidden sm:block">→</div>
          </Link>
        ))}
      </div>

      {sessions.length > 5 && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="w-full text-center text-[10px] text-gray-400 hover:text-gray-300 transition-colors py-3 border-t border-white/[0.04] mt-2"
        >
          {expanded ? "Show less" : `Show all ${sessions.length} sessions`}
        </button>
      )}
    </div>
  );
}
