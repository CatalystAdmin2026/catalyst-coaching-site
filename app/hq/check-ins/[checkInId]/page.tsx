// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Check-In Review Detail
//
// Server Component. Displays the full client check-in with
// comparison data (previous reviewed check-in) and the coach
// review panel (Client Component for response editing).
//
// Auth: HQ layout (requireCoachOrAdminPage).
// Returns 404 if check-in ID does not exist.
// ─────────────────────────────────────────────────────────────

import { notFound } from "next/navigation";
import Link from "next/link";
import HQBreadcrumbs from "@/components/hq/HQBreadcrumbs";
import { getCoachCheckInDetail } from "@/lib/db/coach-check-in-service";
import CheckInReviewPanel from "@/components/hq/check-ins/CheckInReviewPanel";
import type { CheckInDetail } from "@/lib/db/check-in-service";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function fmtDate(d: string | Date | null, short = false): string {
  if (!d) return "—";
  const opts: Intl.DateTimeFormatOptions = short
    ? { month: "short", day: "numeric" }
    : { weekday: "long", month: "long", day: "numeric", year: "numeric" };
  return new Date(d instanceof Date ? d : d + "T12:00:00").toLocaleDateString("en-US", opts);
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Waiting for Review",
  in_review: "In Review",
  reviewed: "Reviewed",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-gray-400 border-gray-600/40",
  submitted: "text-blue-400 border-blue-500/30",
  in_review: "text-amber-400 border-amber-500/30",
  reviewed: "text-emerald-400 border-emerald-500/30",
};

// ─────────────────────────────────────────────────────────────
// DATA DISPLAY COMPONENTS
// ─────────────────────────────────────────────────────────────

function RatingBar({
  value,
  prev,
  label,
}: {
  value: number | null;
  prev: number | null;
  label: string;
}) {
  const fillPct = value !== null ? ((value - 1) / 9) * 100 : 0;
  const delta =
    value !== null && prev !== null ? value - prev : null;

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] w-24 shrink-0">
        {label}
      </p>
      {value !== null ? (
        <>
          <div className="flex-1 h-1 bg-white/[0.06] relative">
            <div
              className="absolute left-0 top-0 h-full bg-[#C9A24D]/50"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className="text-[#C9A24D] text-xs font-bold w-8 text-right shrink-0">
            {value}/10
          </span>
          {prev !== null && (
            <span
              className={`text-[10px] w-8 text-right shrink-0 tabular-nums ${
                delta! > 0
                  ? "text-emerald-400"
                  : delta! < 0
                  ? "text-red-400"
                  : "text-gray-600"
              }`}
            >
              {delta! > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </>
      ) : (
        <span className="text-gray-600 text-xs">—</span>
      )}
    </div>
  );
}

function MetricPair({
  label,
  current,
  previous,
  suffix,
}: {
  label: string;
  current: string | number | null;
  previous?: string | number | null;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] w-28 shrink-0">
        {label}
      </p>
      {current !== null ? (
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">
            {current}
            {suffix}
          </span>
          {previous !== null && previous !== undefined && (
            <span className="text-gray-600 text-[10px]">
              prev {previous}
              {suffix}
            </span>
          )}
        </div>
      ) : (
        <span className="text-gray-600 text-xs">—</span>
      )}
    </div>
  );
}

function ComplianceBar({
  label,
  value,
  prev,
}: {
  label: string;
  value: number | null;
  prev: number | null;
}) {
  const delta = value !== null && prev !== null ? value - prev : null;
  return (
    <div className="py-1.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">{label}</p>
        <div className="flex items-center gap-3">
          {value !== null ? (
            <>
              <span
                className={`text-sm font-bold tabular-nums ${
                  value >= 75
                    ? "text-emerald-400"
                    : value >= 50
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {value}%
              </span>
              {delta !== null && (
                <span
                  className={`text-[10px] tabular-nums ${
                    delta > 0
                      ? "text-emerald-400"
                      : delta < 0
                      ? "text-red-400"
                      : "text-gray-600"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}%
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}
        </div>
      </div>
      {value !== null && (
        <div className="h-1 bg-white/[0.06]">
          <div
            className={`h-full ${
              value >= 75
                ? "bg-emerald-500/50"
                : value >= 50
                ? "bg-amber-500/50"
                : "bg-red-500/50"
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
      )}
    </div>
  );
}

function TextSection({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="py-3 border-b border-white/[0.04] last:border-0">
      <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-1.5">{label}</p>
      <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHECK-IN DATA PANEL
// ─────────────────────────────────────────────────────────────

function CheckInDataPanel({
  data,
  prev,
  label,
}: {
  data: CheckInDetail;
  prev: CheckInDetail | null;
  label?: string;
}) {
  return (
    <div className="space-y-5">
      {label && (
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em]">{label}</p>
      )}

      {/* Body */}
      {(data.bodyWeightLbs !== null || data.waistInches !== null) && (
        <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-2">Body</p>
          <MetricPair
            label="Weight"
            current={data.bodyWeightLbs !== null ? `${data.bodyWeightLbs}` : null}
            previous={prev?.bodyWeightLbs ?? null}
            suffix=" lbs"
          />
          <MetricPair
            label="Waist"
            current={data.waistInches !== null ? `${data.waistInches}` : null}
            previous={prev?.waistInches ?? null}
            suffix='"'
          />
        </div>
      )}

      {/* Recovery */}
      {(data.averageStress !== null ||
        data.averageEnergy !== null ||
        data.averageHunger !== null ||
        data.digestionRating !== null ||
        data.averageSleepHours !== null) && (
        <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-2">Recovery</p>
          <MetricPair
            label="Sleep"
            current={data.averageSleepHours !== null ? `${data.averageSleepHours}` : null}
            previous={prev?.averageSleepHours ?? null}
            suffix=" hrs"
          />
          <RatingBar value={data.averageStress} prev={prev?.averageStress ?? null} label="Stress" />
          <RatingBar value={data.averageEnergy} prev={prev?.averageEnergy ?? null} label="Energy" />
          <RatingBar value={data.averageHunger} prev={prev?.averageHunger ?? null} label="Hunger" />
          <RatingBar value={data.digestionRating} prev={prev?.digestionRating ?? null} label="Digestion" />
        </div>
      )}

      {/* Habits */}
      {(data.workoutCompliancePct !== null ||
        data.nutritionCompliancePct !== null ||
        data.averageWaterOunces !== null ||
        data.averageSteps !== null) && (
        <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-2">Habits</p>
          <ComplianceBar
            label="Workout compliance"
            value={data.workoutCompliancePct}
            prev={prev?.workoutCompliancePct ?? null}
          />
          <ComplianceBar
            label="Nutrition compliance"
            value={data.nutritionCompliancePct}
            prev={prev?.nutritionCompliancePct ?? null}
          />
          <MetricPair
            label="Water"
            current={data.averageWaterOunces}
            previous={prev?.averageWaterOunces ?? null}
            suffix=" oz"
          />
          <MetricPair
            label="Steps"
            current={data.averageSteps !== null ? data.averageSteps.toLocaleString() : null}
            previous={prev?.averageSteps !== null && prev?.averageSteps !== undefined ? prev.averageSteps.toLocaleString() : null}
          />
        </div>
      )}

      {/* Reflection */}
      {(data.wins || data.challenges || data.questions || data.clientNotes) && (
        <div className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-2">Reflection</p>
          <TextSection label="Wins" value={data.wins} />
          <TextSection label="Challenges" value={data.challenges} />
          <TextSection label="Questions" value={data.questions} />
          <TextSection label="Notes" value={data.clientNotes} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default async function CheckInReviewPage({
  params,
}: {
  params: Promise<{ checkInId: string }>;
}) {
  const { checkInId } = await params;

  const checkIn = await getCoachCheckInDetail(checkInId);
  if (!checkIn) notFound();

  const weekLabel = fmtDate(checkIn.weekStartDate);

  return (
    <div className="space-y-6 max-w-[900px]">
      <HQBreadcrumbs crumbs={[
        { label: "Mission Control", href: "/hq" },
        { label: "Check-Ins", href: "/hq/check-ins" },
        { label: checkIn.clientName },
      ]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-[0.2em] ${STATUS_COLOR[checkIn.status]}`}
            >
              {STATUS_LABEL[checkIn.status]}
            </span>
          </div>
          <h1 className="text-white text-xl font-bold tracking-wide">
            {checkIn.clientName}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Week of {weekLabel}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {checkIn.submittedAt && (
              <span className="text-[10px] text-gray-500">
                Submitted {fmtDate(checkIn.submittedAt, true)}
              </span>
            )}
            {checkIn.lastEditedAt && (
              <>
                <span className="text-gray-700 text-[10px]">·</span>
                <span className="text-[10px] text-amber-400/80">
                  Edited after submission
                </span>
                <span className="text-[10px] text-gray-600">
                  ({fmtDate(checkIn.lastEditedAt, true)})
                </span>
              </>
            )}
            <Link
              href={`/hq/clients/${checkIn.clientId}`}
              className="text-[10px] text-[#C9A24D]/60 hover:text-[#C9A24D] transition-colors uppercase tracking-[0.15em]"
            >
              View Client Workspace →
            </Link>
          </div>
        </div>
        <Link
          href="/hq/check-ins"
          className="text-[10px] text-gray-500 uppercase tracking-[0.2em] hover:text-white/70 border border-white/[0.07] px-3 py-1.5 transition-colors shrink-0"
        >
          ← Queue
        </Link>
      </div>

      {/* 2-column on desktop: check-in data + review panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Client data */}
        <div className="space-y-5">
          <CheckInDataPanel
            data={checkIn}
            prev={checkIn.previousCheckIn}
            label={checkIn.previousCheckIn ? "This week · vs prior" : "This week"}
          />

          {/* Previous check-in reference */}
          {checkIn.previousCheckIn && (
            <div className="bg-[#0a0b0c] border border-white/[0.04] px-4 py-3">
              <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] mb-1">
                Previous check-in
              </p>
              <p className="text-gray-500 text-xs">
                Week of {fmtDate(checkIn.previousCheckIn.weekStartDate, true)}
              </p>
              <p className="text-gray-600 text-[9px] mt-0.5">
                Deltas (±) shown above in comparison columns
              </p>
            </div>
          )}
        </div>

        {/* Right: Coach review panel */}
        <div className="space-y-5">
          <CheckInReviewPanel
            checkInId={checkIn.id}
            status={checkIn.status}
            clientName={checkIn.clientName}
            initialResponse={checkIn.coachResponse}
          />
        </div>
      </div>
    </div>
  );
}
