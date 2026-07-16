// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Check-In Review Queue
//
// Server Component. Shows all actionable check-ins sorted by
// oldest-waiting first.
//
// Auth: HQ layout (requireCoachOrAdminPage) — no secondary gate.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import HQPageHeader from "@/components/hq/HQPageHeader";
import HQBreadcrumbs from "@/components/hq/HQBreadcrumbs";
import { listCoachCheckIns } from "@/lib/db/coach-check-in-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtWeek(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Waiting",
  in_review: "In Review",
  reviewed: "Reviewed",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-gray-500 border-gray-600/30",
  submitted: "text-blue-400 border-blue-500/30",
  in_review: "text-amber-400 border-amber-500/30",
  reviewed: "text-emerald-400 border-emerald-500/30",
};

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function CheckInQueuePage() {
  const allCheckIns = await listCoachCheckIns({
    status: ["submitted", "in_review", "reviewed"],
  });

  const actionable = allCheckIns.filter(
    (c) => c.status === "submitted" || c.status === "in_review",
  );
  const reviewed = allCheckIns.filter((c) => c.status === "reviewed");

  return (
    <div className="space-y-6">
      <HQBreadcrumbs crumbs={[
        { label: "Mission Control", href: "/hq" },
        { label: "Check-Ins" },
      ]} />

      <HQPageHeader
        title="Check-In Queue"
        subtitle={
          actionable.length === 0
            ? "All check-ins reviewed"
            : `${actionable.length} waiting for review`
        }
      />

      {/* Queue */}
      {actionable.length === 0 ? (
        <div className="border border-dashed border-white/[0.06] px-5 py-10 text-center">
          <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-400 text-[10px]">✓</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">All caught up</p>
          <p className="text-gray-600 text-xs mt-1">No check-ins waiting for review.</p>
        </div>
      ) : (
        <section>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-3">
            Needs Review
          </p>
          <div className="space-y-1.5">
            {actionable.map((item) => (
              <Link
                key={item.id}
                href={`/hq/check-ins/${item.id}`}
                className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3.5 flex items-center gap-4 hover:border-white/[0.12] hover:bg-[#101213] transition-colors block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40"
              >
                {/* Status dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === "in_review"
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                />

                {/* Client + week */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">
                    {item.clientName}
                  </p>
                  <p className="text-gray-500 text-[10px]">
                    Week of {fmtWeek(item.weekStartDate)}
                  </p>
                </div>

                {/* Status */}
                <span
                  className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] shrink-0 hidden sm:inline ${STATUS_COLOR[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>

                {/* Waiting time */}
                {item.waitingDays !== null && (
                  <div className="text-right shrink-0 hidden md:block">
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        item.waitingDays >= 3 ? "text-amber-400" : "text-gray-400"
                      }`}
                    >
                      {item.waitingDays}d
                    </p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">
                      waiting
                    </p>
                  </div>
                )}

                {/* Submitted date */}
                <div className="text-right shrink-0 hidden lg:block">
                  <p className="text-xs text-gray-400">
                    {fmtDate(item.submittedAt)}
                  </p>
                  <p className="text-[9px] text-gray-600 uppercase tracking-[0.15em]">
                    submitted
                  </p>
                </div>

                <span className="text-gray-600 text-xs shrink-0">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviewed (recent history) */}
      {reviewed.length > 0 && (
        <section>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-3">
            Recently Reviewed
          </p>
          <div className="space-y-1.5">
            {reviewed.slice(0, 20).map((item) => (
              <Link
                key={item.id}
                href={`/hq/check-ins/${item.id}`}
                className="bg-[#0a0b0c] border border-white/[0.04] px-4 py-3 flex items-center gap-4 hover:border-white/[0.08] transition-colors block"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 text-sm">{item.clientName}</p>
                  <p className="text-gray-600 text-[10px]">
                    Week of {fmtWeek(item.weekStartDate)}
                  </p>
                </div>
                <span className="text-[9px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 uppercase tracking-[0.2em] shrink-0">
                  Reviewed
                </span>
                <span className="text-gray-700 text-xs shrink-0">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
