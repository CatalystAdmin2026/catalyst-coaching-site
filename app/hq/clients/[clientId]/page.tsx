// Catalyst HQ — Client Detail
// Server component. Auth via layout.tsx.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCoachClientDetail, type AttentionLevel } from "@/lib/db/coach-dashboard-service";
import type { HistorySession } from "@/lib/db/workout-session-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function attentionBadge(level: AttentionLevel) {
  const map: Record<AttentionLevel, string> = {
    critical: "bg-red-500/12 text-red-400 border border-red-500/25",
    high:     "bg-amber-500/12 text-amber-400 border border-amber-500/25",
    medium:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    healthy:  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  };
  return map[level];
}

function statusIcon(status: string) {
  if (status === "completed") return <span className="text-emerald-400">✓</span>;
  if (status === "skipped") return <span className="text-gray-500">—</span>;
  return <span className="text-amber-400">○</span>;
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d instanceof Date ? d : d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-4">
      <p className="text-white text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function SessionRow({ session, clientId }: { session: HistorySession; clientId: string }) {
  return (
    <Link
      href={`/hq/clients/${clientId}/history/${session.id}`}
      className="flex items-center gap-4 px-4 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40"
    >
      <div className="text-sm shrink-0 w-4 text-center">{statusIcon(session.status)}</div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{session.workoutName}</p>
        {session.programWeekNumber && (
          <p className="text-gray-600 text-[10px]">Week {session.programWeekNumber}</p>
        )}
      </div>

      {session.completionPercent > 0 && session.status === "completed" && (
        <p className="text-[#C9A24D] text-xs font-bold tabular-nums shrink-0">
          {session.completionPercent}%
        </p>
      )}

      <div className="text-right shrink-0">
        <p className="text-gray-400 text-xs">
          {fmtDate(session.completedAt ?? session.scheduledDate)}
        </p>
      </div>

      <span className="text-gray-600 text-xs shrink-0 group-hover:text-gray-400 transition-colors">→</span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getCoachClientDetail(clientId);

  if (!client) notFound();

  const displayName = client.preferredName ?? client.fullName;
  const hasProgram = !!client.activeProgramId;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── Back nav ──────────────────────────────────────────── */}
      <Link
        href="/hq/clients"
        className="inline-flex items-center gap-1.5 text-gray-500 text-[11px] uppercase tracking-[0.15em] hover:text-white/70 transition-colors"
      >
        ← All Clients
      </Link>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-wide text-white">{displayName}</h1>
            {client.attentionLevel !== "healthy" && (
              <span
                className={`text-[10px] px-2 py-0.5 font-semibold uppercase tracking-[0.2em] ${attentionBadge(client.attentionLevel)}`}
              >
                {client.attentionLevel}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{client.email}</p>
          {client.attentionReason && (
            <p className="text-gray-400 text-xs mt-1">
              <span className="text-gray-600">Reason: </span>
              {client.attentionReason}
            </p>
          )}
        </div>
      </div>

      {/* ── Program block ─────────────────────────────────────── */}
      <section aria-label="Active program">
        <h2 className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-semibold mb-3">
          Active Program
        </h2>
        {hasProgram ? (
          <div className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{client.activeProgramName}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {client.programStartDate && (
                    <span className="text-gray-500 text-xs">
                      Started {fmtDate(client.programStartDate)}
                    </span>
                  )}
                  {client.programEndDate && (
                    <span className="text-gray-500 text-xs">
                      Ends {fmtDate(client.programEndDate)}
                    </span>
                  )}
                </div>
              </div>
              {client.currentWeek !== null && client.totalWeeks !== null && (
                <div className="text-right shrink-0">
                  <p className="text-[#C9A24D] text-2xl font-bold leading-none">
                    {client.currentWeek}
                  </p>
                  <p className="text-gray-500 text-[9px] uppercase tracking-[0.3em]">
                    / {client.totalWeeks} wks
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-red-500/20 px-5 py-4">
            <p className="text-red-400 text-sm font-medium">No active program</p>
            <p className="text-gray-600 text-xs mt-1">
              Assign a program from{" "}
              <Link href="/admin/programs" className="text-gray-400 hover:text-white underline">
                Admin → Programs
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section aria-label="Training statistics">
        <h2 className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-semibold mb-3">
          Training Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatCard
            label="Total Sessions"
            value={String(client.completedTotal)}
          />
          <StatCard
            label="Last Workout"
            value={fmtRelative(client.lastCompletedAt)}
          />
          <StatCard
            label="This Week"
            value={String(client.completedLast7d)}
            sub="completed"
          />
          <StatCard
            label="30-day Compliance"
            value={client.compliancePct !== null ? `${client.compliancePct}%` : "—"}
            sub={client.compliancePct === null ? "<3 sessions" : undefined}
          />
          <StatCard
            label="Skipped (30d)"
            value={String(client.skippedLast30d)}
          />
        </div>
      </section>

      {/* ── Recent sessions ───────────────────────────────────── */}
      <section aria-label="Recent sessions">
        <h2 className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-semibold mb-3">
          Recent Sessions
        </h2>
        {client.recentSessions.length === 0 ? (
          <div className="border border-dashed border-white/[0.06] px-5 py-6 text-center">
            <p className="text-gray-600 text-sm">No sessions recorded yet.</p>
          </div>
        ) : (
          <div className="bg-[#0d0e0f] border border-white/[0.06]">
            {client.recentSessions.map((session) => (
              <SessionRow key={session.id} session={session} clientId={clientId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
