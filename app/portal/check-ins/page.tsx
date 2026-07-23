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
  draft: "text-white/30 border-white/10",
  submitted: "text-blue-400/70 border-blue-500/20",
  in_review: "text-amber-400/70 border-amber-500/20",
  reviewed: "text-emerald-400/70 border-emerald-500/20",
};

function fmtWeek(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
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
  const clientName = profile?.preferredName ?? profile?.fullName ?? "Client";

  const [window_, history] = await Promise.all([
    getCurrentCheckInWindow(dbUser.id),
    listClientCheckIns(dbUser.id),
  ]);

  const currentWeekCheckIn = window_.existingCheckIn;
  const pastCheckIns = history.filter(
    (c) => c.weekStartDate < window_.weekStartDate,
  );

  const dueDateLabel = new Date(
    window_.dueDate + "T12:00:00",
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const nextWeekStart = new Date(window_.weekEndDate + "T12:00:00");
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  const nextCheckInLabel = nextWeekStart.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  // Determine the primary state — coach response is the most important
  const coachHasResponded =
    currentWeekCheckIn?.hasCoachResponse === true &&
    (currentWeekCheckIn.status === "reviewed" ||
      currentWeekCheckIn.status === "in_review");

  return (
    <PortalShell clientName={clientName}>

      {/* ── CURRENT WEEK — one dominant state, zero ambiguity ── */}
      <section aria-label="This week's check-in">

        {coachHasResponded && currentWeekCheckIn ? (
          /* ── COACH RESPONDED — the highest-priority state ─────────
             This is the variable reward that brings athletes back.
             It must dominate the page completely.
          ── */
          <div>
            <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
              Check-Ins
            </p>
            <h1
              className="text-white font-bold leading-tight mb-2"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              Your coach left feedback.
            </h1>
            <p className="text-white/35 text-sm mb-8">
              Week of {fmtWeek(window_.weekStartDate)}
            </p>
            <Link
              href={`/portal/check-ins/${currentWeekCheckIn.id}`}
              className="inline-block bg-[#c9a24d] text-black text-[11px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#d4af63] transition-colors"
            >
              Read Feedback
            </Link>
            {currentWeekCheckIn.status === "submitted" && (
              <Link
                href={`/portal/check-ins/${currentWeekCheckIn.id}/edit`}
                className="inline-block ml-4 text-[10px] text-white/30 hover:text-white/60 uppercase tracking-[0.2em] transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
        ) : !currentWeekCheckIn ? (
          /* ── NOT STARTED — coach is waiting ── */
          <div>
            <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
              Check-Ins
            </p>
            <h1
              className="text-white font-bold leading-tight mb-2"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              Your coach is waiting.
            </h1>
            <p className="text-white/35 text-sm mb-1">
              Week of {fmtWeek(window_.weekStartDate)}
            </p>
            <p className="text-white/22 text-xs mb-8">
              Due {dueDateLabel}
              {window_.isOverdue && (
                <span className="text-amber-400 ml-2">· Overdue</span>
              )}
            </p>
            <Link
              href="/portal/check-ins/new"
              className="inline-block bg-[#c9a24d] text-black text-[11px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#d4af63] transition-colors"
            >
              Start Check-In
            </Link>
            {history.length === 0 && (
              <p className="text-white/20 text-xs leading-relaxed max-w-xs mt-6">
                Five minutes. Your coach reads every response and adjusts your
                program around it — week by week, for the entire time you train together.
              </p>
            )}
          </div>
        ) : currentWeekCheckIn.status === "draft" ? (
          /* ── DRAFT — almost there ── */
          <div>
            <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
              Check-Ins
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] text-white/28 border border-white/10 px-1.5 py-0.5 uppercase tracking-[0.2em]">
                Draft saved
              </span>
            </div>
            <h1
              className="text-white font-bold leading-tight mb-2"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              Almost there.
            </h1>
            <p className="text-white/35 text-sm mb-8">
              Week of {fmtWeek(window_.weekStartDate)} · Due {dueDateLabel}
              {window_.isOverdue && (
                <span className="text-amber-400 ml-2">· Overdue</span>
              )}
            </p>
            <Link
              href="/portal/check-ins/new"
              className="inline-block border border-[#c9a24d]/30 text-[#c9a24d] text-[11px] font-bold uppercase tracking-[0.3em] px-8 py-4 hover:bg-[#c9a24d]/10 transition-colors"
            >
              Finish Check-In
            </Link>
          </div>
        ) : (
          /* ── SUBMITTED, WAITING FOR RESPONSE ── */
          <div>
            <p className="text-[9px] text-white/22 uppercase tracking-[0.45em] mb-4">
              Check-Ins
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] ${STATUS_COLOR[currentWeekCheckIn.status]}`}
              >
                {STATUS_LABEL[currentWeekCheckIn.status]}
              </span>
            </div>
            <h1
              className="text-white font-bold leading-tight mb-2"
              style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
            >
              Check-in received.
            </h1>
            <p className="text-white/35 text-sm mb-1">
              Week of {fmtWeek(window_.weekStartDate)}
            </p>
            {currentWeekCheckIn.submittedAt && (
              <p className="text-white/22 text-xs mb-1">
                Submitted {fmtDate(currentWeekCheckIn.submittedAt)}
              </p>
            )}
            <p className="text-white/18 text-xs mb-8">
              Next check-in opens {nextCheckInLabel}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href={`/portal/check-ins/${currentWeekCheckIn.id}`}
                className="inline-block border border-white/[0.10] text-white/45 hover:text-white hover:border-white/[0.18] text-[10px] font-medium uppercase tracking-[0.2em] px-5 py-2.5 transition-colors"
              >
                View Check-In
              </Link>
              {currentWeekCheckIn.status === "submitted" && (
                <Link
                  href={`/portal/check-ins/${currentWeekCheckIn.id}/edit`}
                  className="text-[10px] text-white/25 hover:text-white/55 uppercase tracking-[0.2em] transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── HISTORY — secondary, deeply below ── */}
      {pastCheckIns.length > 0 && (
        <section aria-label="Check-in history">
          <p className="text-[9px] text-white/18 uppercase tracking-[0.45em] mb-4">
            History
          </p>
          <div className="divide-y divide-white/[0.04]">
            {pastCheckIns.map((c) => (
              <Link
                key={c.id}
                href={`/portal/check-ins/${c.id}`}
                className="flex items-center gap-4 py-3 hover:opacity-75 transition-opacity"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/45 text-sm">
                    Week of {fmtWeek(c.weekStartDate)}
                  </p>
                  {c.submittedAt && (
                    <p className="text-white/20 text-[10px] mt-0.5">
                      Submitted {fmtDate(c.submittedAt)}
                    </p>
                  )}
                </div>
                {c.hasCoachResponse && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 shrink-0" />
                )}
                <span
                  className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] shrink-0 ${STATUS_COLOR[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {history.length === 0 && !currentWeekCheckIn && (
        <div className="border-t border-white/[0.05] pt-8">
          <p className="text-white/25 text-sm">No check-ins yet.</p>
          <p className="text-white/15 text-xs mt-1 leading-relaxed">
            Your history will appear here after your first submission.
          </p>
        </div>
      )}

    </PortalShell>
  );
}
