"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CoachClientSummary, AttentionLevel } from "@/lib/db/coach-dashboard-service";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const ATTENTION_ORDER: Record<AttentionLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  healthy: 3,
};

function attentionDot(level: AttentionLevel) {
  const map: Record<AttentionLevel, string> = {
    critical: "bg-red-500",
    high:     "bg-amber-400",
    medium:   "bg-yellow-400",
    healthy:  "bg-emerald-400",
  };
  return map[level];
}

function attentionLabel(level: AttentionLevel) {
  const map: Record<AttentionLevel, string> = {
    critical: "text-red-400",
    high:     "text-amber-400",
    medium:   "text-yellow-400",
    healthy:  "text-emerald-400",
  };
  return map[level];
}

function fmtRelative(d: Date | null): string {
  if (!d) return "Never";
  const diffMs = Date.now() - new Date(d).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

type SortKey = "name" | "attention" | "lastWorkout" | "compliance";
type AttentionFilter = AttentionLevel | "all";

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ClientsDirectory({ clients }: { clients: CoachClientSummary[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("attention");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");

  const filtered = useMemo(() => {
    let result = clients;

    // Search by name or email
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.preferredName ?? "").toLowerCase().includes(q),
      );
    }

    // Filter by attention level
    if (attentionFilter !== "all") {
      result = result.filter((c) => c.attentionLevel === attentionFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortKey === "attention") {
        const cmp = ATTENTION_ORDER[a.attentionLevel] - ATTENTION_ORDER[b.attentionLevel];
        if (cmp !== 0) return cmp;
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortKey === "name") return a.fullName.localeCompare(b.fullName);
      if (sortKey === "lastWorkout") {
        const aMs = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
        const bMs = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
        return bMs - aMs;
      }
      if (sortKey === "compliance") {
        const aPct = a.compliancePct ?? -1;
        const bPct = b.compliancePct ?? -1;
        return bPct - aPct;
      }
      return 0;
    });

    return result;
  }, [clients, query, sortKey, attentionFilter]);

  const counts: Record<AttentionFilter, number> = useMemo(() => {
    const all = clients.length;
    const critical = clients.filter((c) => c.attentionLevel === "critical").length;
    const high = clients.filter((c) => c.attentionLevel === "high").length;
    const medium = clients.filter((c) => c.attentionLevel === "medium").length;
    const healthy = clients.filter((c) => c.attentionLevel === "healthy").length;
    return { all, critical, high, medium, healthy };
  }, [clients]);

  return (
    <div className="space-y-5">
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-0 bg-[#0d0e0f] border border-white/[0.07] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C9A24D]/30 focus:ring-0"
        />

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-[#0d0e0f] border border-white/[0.07] px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#C9A24D]/30 cursor-pointer"
          aria-label="Sort clients by"
        >
          <option value="attention">Sort: Attention</option>
          <option value="name">Sort: Name</option>
          <option value="lastWorkout">Sort: Last Workout</option>
          <option value="compliance">Sort: Compliance</option>
        </select>
      </div>

      {/* ── Attention filter tabs ─────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        {(["all", "critical", "high", "medium", "healthy"] as const).map((level) => (
          <button
            key={level}
            onClick={() => setAttentionFilter(level)}
            className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 border transition-colors ${
              attentionFilter === level
                ? "border-[#C9A24D]/30 text-[#C9A24D] bg-[#C9A24D]/08"
                : "border-white/[0.06] text-gray-500 hover:text-gray-300 hover:border-white/[0.10]"
            }`}
          >
            {level === "all" ? "All" : level}
            <span className="ml-1.5 text-gray-600">{counts[level]}</span>
          </button>
        ))}
      </div>

      {/* ── Results summary ───────────────────────────────────── */}
      <div className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
        {filtered.length} of {clients.length} clients
      </div>

      {/* ── Client rows ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-white/[0.06] px-5 py-8 text-center">
          <p className="text-gray-500 text-sm">No clients match your search.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((client) => (
            <Link
              key={client.userId}
              href={`/hq/clients/${client.userId}`}
              className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3.5 flex items-center gap-4 hover:border-white/[0.12] hover:bg-[#101213] transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40"
            >
              {/* Attention dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${attentionDot(client.attentionLevel)}`}
                aria-hidden
              />

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-semibold group-hover:text-white/90 transition-colors">
                    {client.preferredName ?? client.fullName}
                  </span>
                  {client.preferredName && client.preferredName !== client.fullName && (
                    <span className="text-gray-600 text-[10px]">({client.fullName})</span>
                  )}
                  <span
                    className={`text-[9px] uppercase tracking-[0.2em] font-semibold ${attentionLabel(client.attentionLevel)}`}
                  >
                    {client.attentionLevel}
                  </span>
                </div>
                <p className="text-gray-600 text-[10px] truncate">{client.email}</p>
              </div>

              {/* Program */}
              <div className="hidden md:block text-right shrink-0 min-w-[120px]">
                {client.activeProgramName ? (
                  <>
                    <p className="text-gray-300 text-xs truncate max-w-[160px]">
                      {client.activeProgramName}
                    </p>
                    {client.currentWeek !== null && client.totalWeeks !== null && (
                      <p className="text-gray-600 text-[10px]">
                        Wk {client.currentWeek}/{client.totalWeeks}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-red-400 text-[10px] font-semibold uppercase tracking-[0.15em]">
                    No program
                  </p>
                )}
              </div>

              {/* Compliance */}
              <div className="hidden sm:block text-right shrink-0 w-16">
                {client.compliancePct !== null ? (
                  <>
                    <p
                      className={`text-sm font-bold tabular-nums leading-none ${
                        client.compliancePct >= 75
                          ? "text-emerald-400"
                          : client.compliancePct >= 50
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {client.compliancePct}%
                    </p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">compliance</p>
                  </>
                ) : (
                  <p className="text-gray-700 text-xs">—</p>
                )}
              </div>

              {/* Last workout */}
              <div className="hidden lg:block text-right shrink-0 w-20">
                <p className="text-xs text-gray-400">{fmtRelative(client.lastCompletedAt)}</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">last session</p>
              </div>

              {/* Totals */}
              <div className="hidden xl:block text-right shrink-0 w-16">
                <p className="text-xs text-gray-400 tabular-nums">{client.completedTotal}</p>
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">sessions</p>
              </div>

              <span className="text-gray-600 text-xs shrink-0 group-hover:text-gray-400 transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
