"use client";

import { useState } from "react";
import type { InjurySummary } from "@/lib/db/coach-client-workspace-service";

interface Props {
  medicalClearanceRequired: boolean;
  medicalClearanceReceived: boolean;
  physicianRestrictions: string | null;
  activeInjuries: InjurySummary[];
}

const SEVERITY_LABEL: Record<number, string> = {
  1: "Mild", 2: "Mild", 3: "Mild",
  4: "Moderate", 5: "Moderate", 6: "Moderate",
  7: "Significant", 8: "Significant",
  9: "Severe", 10: "Severe",
};

export default function SensitiveHealthPanel({
  medicalClearanceRequired,
  medicalClearanceReceived,
  physicianRestrictions,
  activeInjuries,
}: Props) {
  const [open, setOpen] = useState(false);

  const hasContent =
    medicalClearanceRequired ||
    physicianRestrictions ||
    activeInjuries.length > 0;

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full text-left group"
        aria-expanded={open}
      >
        <h2 className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-semibold">
          Health &amp; Limitations — Sensitive
        </h2>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-gray-600 text-[10px] uppercase tracking-[0.2em] group-hover:text-gray-400 transition-colors">
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {!hasContent ? (
            <p className="text-gray-600 text-xs px-1">No health restrictions or limitations on file.</p>
          ) : (
            <>
              {/* Medical clearance */}
              {medicalClearanceRequired && (
                <div
                  className={`border px-4 py-3 ${
                    medicalClearanceReceived
                      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                      : "border-amber-500/25 bg-amber-500/[0.05]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-0.5 text-gray-400">
                    Medical Clearance Required
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      medicalClearanceReceived ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {medicalClearanceReceived ? "Clearance received" : "Awaiting clearance"}
                  </p>
                </div>
              )}

              {/* Physician restrictions */}
              {physicianRestrictions && (
                <div className="border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-gray-400 mb-1">
                    Physician Restrictions
                  </p>
                  <p className="text-sm text-red-300 leading-relaxed">{physicianRestrictions}</p>
                </div>
              )}

              {/* Active injuries */}
              {activeInjuries.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-gray-500 mb-2">
                    Active Injuries / Limitations ({activeInjuries.length})
                  </p>
                  <div className="space-y-2">
                    {activeInjuries.map((injury) => (
                      <div
                        key={injury.id}
                        className="bg-[#0d0e0f] border border-white/[0.06] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold">
                              {injury.conditionName ?? injury.description}
                            </p>
                            <p className="text-gray-500 text-[10px] mt-0.5">
                              {injury.bodyRegion}
                              {injury.status && (
                                <> · <span className="capitalize">{injury.status}</span></>
                              )}
                              {injury.severity !== null && (
                                <> · {SEVERITY_LABEL[injury.severity] ?? "Unknown"} ({injury.severity}/10)</>
                              )}
                            </p>
                            {injury.exerciseRestrictions && (
                              <p className="text-amber-400/70 text-[10px] mt-1 italic">
                                Restrictions: {injury.exerciseRestrictions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
