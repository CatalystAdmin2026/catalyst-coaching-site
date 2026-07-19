// ─────────────────────────────────────────────────────────────
// Catalyst Portal — Check-In Detail
//
// Server Component. Shows the client their submitted check-in
// and coach response (only after status = reviewed).
//
// Auth: portal layout + role guard below.
// Returns 404 on ownership mismatch (does not confirm ID exists).
// ─────────────────────────────────────────────────────────────

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireClientUser } from "@/lib/supabase/session";
import { getClientCheckInDetail } from "@/lib/db/check-in-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────

function fmtTimestamp(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d instanceof Date ? d : d + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );
}

function RatingPill({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] w-28 shrink-0">{label}</p>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 ${
              i < value ? "bg-[#C9A24D]/60" : "bg-white/[0.06]"
            }`}
          />
        ))}
      </div>
      <span className="text-[#C9A24D] text-xs font-bold">{value}/10</span>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null) return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] w-28 shrink-0 pt-px">{label}</p>
      <p className="text-white text-sm font-medium">{String(value)}</p>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-1.5">{label}</p>
      <p className="text-gray-200 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "Coach reviewing",
  reviewed: "Reviewed",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-gray-400 border-gray-600/40",
  submitted: "text-blue-400 border-blue-500/30",
  in_review: "text-amber-400 border-amber-500/30",
  reviewed: "text-emerald-400 border-emerald-500/30",
};

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function CheckInDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ checkInId: string }>;
  searchParams: Promise<{ edited?: string }>;
}) {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const { checkInId } = await params;
  const { edited } = await searchParams;

  const checkIn = await getClientCheckInDetail(dbUser.id, checkInId);
  if (!checkIn) notFound();

  const hasBody =
    checkIn.bodyWeightLbs !== null || checkIn.waistInches !== null;
  const hasRecovery =
    checkIn.averageSleepHours !== null ||
    checkIn.averageStress !== null ||
    checkIn.averageEnergy !== null ||
    checkIn.averageHunger !== null ||
    checkIn.digestionRating !== null;
  const hasHabits =
    checkIn.averageWaterOunces !== null ||
    checkIn.averageSteps !== null ||
    checkIn.workoutCompliancePct !== null ||
    checkIn.nutritionCompliancePct !== null;
  const hasReflection =
    checkIn.wins ||
    checkIn.challenges ||
    checkIn.questions ||
    checkIn.clientNotes;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href="/portal/check-ins"
        className="inline-flex items-center gap-1.5 text-gray-500 text-[10px] uppercase tracking-[0.2em] hover:text-gray-300 transition-colors mb-8"
      >
        ← Check-Ins
      </Link>

      {/* Success banner (shown after editing) */}
      {edited === "1" && (
        <div className="bg-emerald-500/[0.06] border border-emerald-500/25 px-4 py-3 mb-6">
          <p className="text-emerald-400 text-sm font-medium">Changes saved</p>
          <p className="text-emerald-300/60 text-xs mt-0.5">
            Your check-in has been updated. Your coach will see the latest version.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] ${STATUS_COLOR[checkIn.status]}`}
            >
              {STATUS_LABEL[checkIn.status]}
            </span>
          </div>
          {/* Edit button — shown only while status is 'submitted' */}
          {checkIn.status === "submitted" && (
            <Link
              href={`/portal/check-ins/${checkInId}/edit`}
              className="text-[10px] text-[#C9A24D]/70 hover:text-[#C9A24D] border border-[#C9A24D]/20 hover:border-[#C9A24D]/40 px-3 py-1.5 uppercase tracking-[0.15em] transition-colors shrink-0"
            >
              Edit
            </Link>
          )}
        </div>
        <h1 className="text-white text-xl font-bold tracking-wide">
          Week of {fmtDate(checkIn.weekStartDate)}
        </h1>
        {checkIn.submittedAt && (
          <p className="text-gray-500 text-xs mt-1">
            Submitted {fmtDate(checkIn.submittedAt)}
          </p>
        )}
        {checkIn.lastEditedAt && (
          <p className="text-gray-600 text-[10px] mt-0.5">
            Last edited {fmtTimestamp(checkIn.lastEditedAt)}
          </p>
        )}
      </div>

      {/* Status message */}
      {checkIn.status === "submitted" && (
        <div className="bg-blue-500/[0.05] border border-blue-500/20 px-4 py-3 mb-6">
          <p className="text-blue-400 text-sm font-medium">Waiting for coach review</p>
          <p className="text-blue-300/60 text-xs mt-0.5">
            Your coach will respond once they review this check-in. You can still{" "}
            <Link
              href={`/portal/check-ins/${checkInId}/edit`}
              className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
            >
              edit it
            </Link>{" "}
            until then.
          </p>
        </div>
      )}
      {checkIn.status === "in_review" && (
        <div className="bg-amber-500/[0.05] border border-amber-500/20 px-4 py-3 mb-6">
          <p className="text-amber-400 text-sm font-medium">Your coach is reviewing this</p>
          <p className="text-amber-300/60 text-xs mt-0.5">
            A response will be available soon.
          </p>
        </div>
      )}

      {/* Coach response */}
      {checkIn.status === "reviewed" && checkIn.coachResponse && (
        <div className="bg-emerald-500/[0.05] border border-emerald-500/20 px-5 py-5 mb-8">
          <p className="text-[9px] text-emerald-400 uppercase tracking-[0.4em] mb-3">
            Coach Response
          </p>
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {checkIn.coachResponse}
          </p>
          {checkIn.coachReviewedAt && (
            <p className="text-gray-600 text-[10px] mt-3">
              Reviewed {fmtDate(checkIn.coachReviewedAt)}
            </p>
          )}
        </div>
      )}
      {checkIn.status === "reviewed" && !checkIn.coachResponse && (
        <div className="border border-white/[0.06] px-4 py-3 mb-8">
          <p className="text-gray-500 text-sm">Coach reviewed this check-in without adding a written response.</p>
        </div>
      )}

      {/* Body section */}
      {hasBody && (
        <section className="mb-6">
          <p className="text-[9px] text-gray-400 uppercase tracking-[0.4em] mb-3">
            Body
          </p>
          <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
            <MetricRow
              label="Weight"
              value={checkIn.bodyWeightLbs !== null ? `${checkIn.bodyWeightLbs} lbs` : null}
            />
            <MetricRow
              label="Waist"
              value={checkIn.waistInches !== null ? `${checkIn.waistInches}"` : null}
            />
          </div>
        </section>
      )}

      {/* Recovery section */}
      {hasRecovery && (
        <section className="mb-6">
          <p className="text-[9px] text-gray-400 uppercase tracking-[0.4em] mb-3">
            Recovery
          </p>
          <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
            <MetricRow
              label="Sleep"
              value={checkIn.averageSleepHours !== null ? `${checkIn.averageSleepHours} hrs/night` : null}
            />
            <RatingPill value={checkIn.averageStress} label="Stress" />
            <RatingPill value={checkIn.averageEnergy} label="Energy" />
            <RatingPill value={checkIn.averageHunger} label="Hunger" />
            <RatingPill value={checkIn.digestionRating} label="Digestion" />
          </div>
        </section>
      )}

      {/* Habits section */}
      {hasHabits && (
        <section className="mb-6">
          <p className="text-[9px] text-gray-400 uppercase tracking-[0.4em] mb-3">
            Habits
          </p>
          <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
            <MetricRow
              label="Water"
              value={checkIn.averageWaterOunces !== null ? `${checkIn.averageWaterOunces} oz/day` : null}
            />
            <MetricRow
              label="Steps"
              value={checkIn.averageSteps !== null
                ? checkIn.averageSteps.toLocaleString()
                : null}
            />
            <MetricRow
              label="Workout"
              value={checkIn.workoutCompliancePct !== null ? `${checkIn.workoutCompliancePct}% compliance` : null}
            />
            <MetricRow
              label="Nutrition"
              value={checkIn.nutritionCompliancePct !== null ? `${checkIn.nutritionCompliancePct}% compliance` : null}
            />
          </div>
        </section>
      )}

      {/* Reflection section */}
      {hasReflection && (
        <section className="mb-6">
          <p className="text-[9px] text-gray-400 uppercase tracking-[0.4em] mb-3">
            Reflection
          </p>
          <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-2">
            <TextBlock label="Wins" value={checkIn.wins} />
            <TextBlock label="Challenges" value={checkIn.challenges} />
            <TextBlock label="Questions" value={checkIn.questions} />
            <TextBlock label="Additional notes" value={checkIn.clientNotes} />
          </div>
        </section>
      )}

      {!hasBody && !hasRecovery && !hasHabits && !hasReflection && (
        <div className="border border-dashed border-white/[0.06] px-5 py-5 text-center">
          <p className="text-gray-600 text-sm">No data was filled in for this check-in.</p>
        </div>
      )}
    </div>
  );
}
