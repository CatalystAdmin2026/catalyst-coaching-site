import Link from "next/link";
import type { WeeklyComplianceSnapshot } from "@/lib/db/portal-dashboard-service";

interface Props {
  data: WeeklyComplianceSnapshot;
  isOnboarding?: boolean;
}

function fmtWeekRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.getDate()}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

type CheckInState =
  | "none"         // no check-in, not overdue
  | "none_overdue" // no check-in, past due
  | "draft"
  | "submitted"
  | "in_review"
  | "reviewed";

function resolveState(status: string | null): CheckInState {
  if (!status) return "none";
  return status as CheckInState;
}

export default function WeeklyRhythm({ data, isOnboarding = false }: Props) {
  const state = resolveState(data.checkInStatus);
  const weekLabel = fmtWeekRange(data.weekStartDate, data.weekEndDate);

  return (
    <div className="bg-[#0d0e0f] border border-white/[0.07] p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-white/22 uppercase tracking-[0.45em]">
          Weekly Check-In
        </p>
        <p className="text-[9px] text-white/18 tabular-nums">{weekLabel}</p>
      </div>

      {/* State display */}
      {(state === "none" || state === "none_overdue") && (
        <>
          <div>
            {isOnboarding ? (
              <>
                <p className="text-white text-base font-bold leading-tight mb-1.5">
                  Your coach reviews everything you send.
                </p>
                <p className="text-white/30 text-xs leading-relaxed">
                  Share your sleep, energy, schedule, and goals. The more honest your answers, the more precisely the training fits.
                </p>
              </>
            ) : (
              <>
                <p className="text-white text-base font-bold leading-tight mb-1">
                  Not submitted.
                </p>
                <p className={`text-xs font-medium mb-2 ${state === "none_overdue" ? "text-[#c9a24d]" : "text-white/35"}`}>
                  {state === "none_overdue" ? "Due today" : "Due this week"}
                </p>
                <p className="text-white/28 text-xs leading-relaxed">
                  Your coach is waiting to hear from you.
                </p>
              </>
            )}
          </div>
          {isOnboarding ? (
            <Link
              href="/portal/check-ins/new"
              className="text-[#c9a24d]/65 text-xs font-semibold hover:text-[#c9a24d] transition-colors self-start"
            >
              Submit check-in →
            </Link>
          ) : (
            <Link
              href="/portal/check-ins/new"
              className="block w-full border border-[#c9a24d]/40 text-[#c9a24d] text-[11px] font-bold uppercase tracking-[0.3em] py-3.5 text-center hover:bg-[#c9a24d]/08 transition-colors"
            >
              Submit Check-In
            </Link>
          )}
        </>
      )}

      {state === "draft" && (
        <>
          <div>
            <p className="text-white text-base font-bold leading-tight mb-0.5">
              Almost there.
            </p>
            <p className="text-white/30 text-xs">Draft saved</p>
          </div>
          <Link
            href="/portal/check-ins/new"
            className="block w-full border border-[#c9a24d]/30 text-[#c9a24d] text-[11px] font-bold uppercase tracking-[0.3em] py-3.5 text-center hover:bg-[#c9a24d]/10 transition-colors"
          >
            Finish Check-In
          </Link>
        </>
      )}

      {state === "submitted" && (
        <div>
          <p className="text-white text-base font-bold leading-tight mb-0.5">
            Check-in received.
          </p>
          <p className="text-white/30 text-xs">Your coach is reviewing</p>
        </div>
      )}

      {state === "in_review" && (
        <div>
          <p className="text-white text-base font-bold leading-tight mb-0.5">
            Your coach is reviewing.
          </p>
          <p className="text-white/30 text-xs">Feedback coming soon</p>
        </div>
      )}

      {state === "reviewed" && (
        <>
          <div>
            <p className="text-white text-base font-bold leading-tight mb-0.5">
              Your coach responded.
            </p>
            <p className="text-white/30 text-xs">Feedback ready</p>
          </div>
          <Link
            href="/portal/check-ins"
            className="block w-full bg-[#c9a24d] text-black text-[11px] font-bold uppercase tracking-[0.3em] py-3.5 text-center hover:bg-[#d4af63] transition-colors"
          >
            Read Feedback
          </Link>
        </>
      )}
    </div>
  );
}
