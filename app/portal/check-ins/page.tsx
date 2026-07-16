// ─────────────────────────────────────────────────────────────
// Catalyst Portal — Check-Ins List
//
// Server Component. Shows current week status and check-in history.
// Auth: portal layout (requireClientUser) + role guard below.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import {
  getCurrentCheckInWindow,
  listClientCheckIns,
} from "@/lib/db/check-in-service";
import PortalShell from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  reviewed: "Reviewed",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-gray-400 border-gray-600/40",
  submitted: "text-blue-400 border-blue-500/30",
  in_review: "text-amber-400 border-amber-500/30",
  reviewed: "text-emerald-400 border-emerald-500/30",
};

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

export default async function CheckInsPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const profile = await getClientProfile(dbUser.id);
  const clientName =
    profile?.preferredName ?? profile?.fullName ?? "Client";

  const [window_, history] = await Promise.all([
    getCurrentCheckInWindow(dbUser.id),
    listClientCheckIns(dbUser.id),
  ]);

  const currentWeekCheckIn = window_.existingCheckIn;
  const pastCheckIns = history.filter(
    (c) => c.weekStartDate < window_.weekStartDate,
  );

  // Due date display
  const dueDateLabel = new Date(window_.dueDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "short", day: "numeric" },
  );

  return (
    <PortalShell clientName={clientName}>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-white text-xl font-bold tracking-wide">
            Weekly Check-Ins
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            One honest check-in per week keeps your coach in your corner.
          </p>
        </div>

        {/* Current week card */}
        <section>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-3">
            This Week
          </p>

          {!currentWeekCheckIn ? (
            // Not started
            <div className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-5 relative overflow-hidden">
              <div className="h-px absolute top-0 inset-x-0 bg-gradient-to-r from-transparent via-[#C9A24D]/15 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">
                    Week of {fmtWeek(window_.weekStartDate)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Due {dueDateLabel}
                    {window_.isOverdue && (
                      <span className="ml-2 text-amber-400">· Overdue</span>
                    )}
                  </p>
                </div>
                <Link
                  href="/portal/check-ins/new"
                  className="shrink-0 bg-[#C9A24D] text-black text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 hover:bg-[#d4af63] transition-colors"
                >
                  Start Check-In
                </Link>
              </div>
            </div>
          ) : currentWeekCheckIn.status === "draft" ? (
            // Draft in progress
            <div className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-5 relative overflow-hidden">
              <div className="h-px absolute top-0 inset-x-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] text-gray-500 border border-gray-600/40 px-1.5 py-0.5 uppercase tracking-[0.2em]">
                      Draft saved
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    Week of {fmtWeek(window_.weekStartDate)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Due {dueDateLabel}
                    {window_.isOverdue && (
                      <span className="ml-2 text-amber-400">· Overdue</span>
                    )}
                  </p>
                </div>
                <Link
                  href="/portal/check-ins/new"
                  className="shrink-0 text-[10px] text-[#C9A24D] border border-[#C9A24D]/25 font-bold uppercase tracking-[0.2em] px-4 py-2 hover:bg-[#C9A24D]/10 transition-colors"
                >
                  Continue
                </Link>
              </div>
            </div>
          ) : (
            // Submitted / in_review / reviewed
            <Link
              href={`/portal/check-ins/${currentWeekCheckIn.id}`}
              className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-5 flex items-start justify-between gap-4 hover:border-white/[0.12] transition-colors block"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] ${STATUS_COLOR[currentWeekCheckIn.status]}`}
                  >
                    {STATUS_LABEL[currentWeekCheckIn.status]}
                  </span>
                  {currentWeekCheckIn.hasCoachResponse && (
                    <span className="text-[9px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 uppercase tracking-[0.2em]">
                      Response ready
                    </span>
                  )}
                </div>
                <p className="text-white font-semibold">
                  Week of {fmtWeek(currentWeekCheckIn.weekStartDate)}
                </p>
                {currentWeekCheckIn.submittedAt && (
                  <p className="text-gray-500 text-xs mt-1">
                    Submitted {fmtDate(currentWeekCheckIn.submittedAt)}
                  </p>
                )}
              </div>
              <span className="text-gray-600 text-sm shrink-0">→</span>
            </Link>
          )}
        </section>

        {/* History */}
        {pastCheckIns.length > 0 && (
          <section>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-3">
              History
            </p>
            <div className="space-y-1.5">
              {pastCheckIns.map((c) => (
                <Link
                  key={c.id}
                  href={`/portal/check-ins/${c.id}`}
                  className="bg-[#0d0e0f] border border-white/[0.05] px-4 py-3 flex items-center gap-4 hover:border-white/[0.10] hover:bg-[#101213] transition-colors block"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      Week of {fmtWeek(c.weekStartDate)}
                    </p>
                    {c.submittedAt && (
                      <p className="text-gray-600 text-[10px]">
                        Submitted {fmtDate(c.submittedAt)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] shrink-0 ${STATUS_COLOR[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.hasCoachResponse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <span className="text-gray-600 text-xs shrink-0">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {history.length === 0 && !currentWeekCheckIn && (
          <div className="border border-dashed border-white/[0.06] px-5 py-8 text-center">
            <p className="text-gray-500 text-sm">No check-ins yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              Your check-in history will appear here once you submit your first one.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
