import Link from "next/link";
import type { WeeklyComplianceSnapshot } from "@/lib/db/portal-dashboard-service";

interface Props {
  data: WeeklyComplianceSnapshot;
}

const CHECK_IN_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-white/35" },
  submitted: { label: "Submitted", color: "text-[#c9a24d]" },
  in_review: { label: "In Review", color: "text-blue-400" },
  reviewed: { label: "Reviewed", color: "text-emerald-400" },
};

function fmtDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function WeeklyComplianceCard({ data }: Props) {
  const totalLogged = data.sessionsThisWeek;
  const pct =
    totalLogged > 0
      ? Math.round((data.completedThisWeek / totalLogged) * 100)
      : null;

  const checkInMeta = data.checkInStatus
    ? CHECK_IN_STATUS_LABEL[data.checkInStatus] ?? { label: data.checkInStatus, color: "text-white/35" }
    : null;

  return (
    <div className="border border-white/[0.07] bg-[#0d0e0f] divide-y divide-white/[0.06]">
      {/* Week label */}
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-[10px] text-white/40 tabular-nums">
          Week of {fmtDate(data.weekStartDate)}
        </p>
        {pct !== null && (
          <p className={`text-[10px] font-bold tabular-nums ${pct === 100 ? "text-emerald-400" : "text-[#c9a24d]"}`}>
            {pct}% complete
          </p>
        )}
      </div>

      {/* Session metrics */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
        <div className="px-4 py-4 text-center">
          <p className="text-xl font-bold text-white tabular-nums">{data.completedThisWeek}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-0.5">Done</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xl font-bold text-white/50 tabular-nums">{data.skippedThisWeek}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-0.5">Skipped</p>
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-xl font-bold text-white/50 tabular-nums">
            {data.sessionsThisWeek - data.completedThisWeek - data.skippedThisWeek > 0
              ? data.sessionsThisWeek - data.completedThisWeek - data.skippedThisWeek
              : "—"}
          </p>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-0.5">Pending</p>
        </div>
      </div>

      {/* Check-in status */}
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em]">Weekly Check-In</p>
        {checkInMeta ? (
          <span className={`text-[10px] font-medium ${checkInMeta.color}`}>
            {checkInMeta.label}
          </span>
        ) : (
          <Link
            href="/portal/check-ins/new"
            className="text-[10px] text-[#c9a24d]/70 hover:text-[#c9a24d] transition-colors font-medium"
          >
            Submit now →
          </Link>
        )}
      </div>
    </div>
  );
}
