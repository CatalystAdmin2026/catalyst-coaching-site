"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Program Assignment Modal (Sprint 6.3A)
//
// Three-step flow:
//   Step 1 — Choose Blueprint (searchable list)
//   Step 2 — Set Schedule (start date, auto end date)
//   Step 3 — Preview & Confirm (week 1 schedule + warnings)
//
// Opens when it receives the custom event "hq:assign-program:open".
// Closes on: backdrop click, ESC key, or successful assignment.
// Focus is trapped within the panel while open.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BlueprintForAssignment } from "@/lib/db/coach-program-assignment-service";
import { assignProgramAction } from "@/app/hq/clients/[clientId]/actions";

const OPEN_EVENT = "hq:assign-program:open";
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────

function nextMonday(): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun
  const daysUntil = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addWeeks(startDate: string, weeks: number): string {
  const d = new Date(startDate + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7 - 1);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  fat_loss: "Fat Loss",
  muscle_growth: "Muscle Growth",
  body_recomposition: "Recomposition",
  athletic_performance: "Athletic",
  lifestyle: "Lifestyle",
  competition_prep: "Competition Prep",
  executive_performance: "Executive",
};

const EXP_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  competitive: "Competitive",
  mixed: "Mixed",
};

// ─────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Blueprint" },
    { n: 2, label: "Schedule" },
    { n: 3, label: "Confirm" },
  ];
  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center min-w-0" style={{ flex: i < steps.length - 1 ? "1 1 0" : undefined }}>
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shrink-0 ${
                step === s.n
                  ? "bg-[#C9A24D] text-black"
                  : step > s.n
                  ? "bg-[#C9A24D]/20 text-[#C9A24D]"
                  : "bg-white/[0.06] text-gray-500"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </div>
            <p
              className={`text-[8px] uppercase tracking-[0.2em] mt-1 font-semibold transition-colors ${
                step === s.n ? "text-[#C9A24D]" : step > s.n ? "text-[#C9A24D]/50" : "text-gray-600"
              }`}
            >
              {s.label}
            </p>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-3 mb-4 transition-colors ${
                step > s.n ? "bg-[#C9A24D]/30" : "bg-white/[0.06]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  hasActiveProgram: boolean;
  activeProgramName: string | null;
  blueprints: BlueprintForAssignment[];
}

export default function AssignProgramModal({
  clientId,
  hasActiveProgram,
  activeProgramName,
  blueprints,
}: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Modal open state
  const [isOpen, setIsOpen] = useState(false);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Step 2 state
  const [startDate, setStartDate] = useState(nextMonday);

  // Step 3 state
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected blueprint derived value
  const selected = blueprints.find((b) => b.id === selectedId) ?? null;
  const endDate = selected?.defaultDurationWeeks && startDate
    ? addWeeks(startDate, selected.defaultDurationWeeks)
    : null;

  // ── Handlers (declared before effects that reference them)
  const resetState = useCallback(() => {
    setStep(1);
    setSearch("");
    setSelectedId(null);
    setStartDate(nextMonday());
    setConfirmReplace(false);
    setLoading(false);
    setSuccess(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    setIsOpen(false);
    setTimeout(resetState, 300);
  }, [loading, resetState]);

  // ── Event listener — opens modal on custom event
  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    document.addEventListener(OPEN_EVENT, handleOpen);
    return () => document.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  // ── Focus trap + ESC handler
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    // Focus first element
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
    );
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;

      const els = panel!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
      );
      if (els.length === 0) return;

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, step, handleClose]);

  // ── Filtered blueprint list
  const filtered = search.trim()
    ? blueprints.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.category.toLowerCase().includes(search.toLowerCase()),
      )
    : blueprints;

  function handleNext() {
    if (step === 1 && selectedId) setStep(2);
    else if (step === 2 && startDate) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  async function handleAssign() {
    if (!selectedId || !startDate) return;
    if (hasActiveProgram && !confirmReplace) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assignProgramAction({
        clientId,
        programTemplateId: selectedId,
        startDate,
        coachNotes: null,
      });

      if (result.ok) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setTimeout(() => {
            resetState();
            router.refresh();
          }, 150);
        }, 1200);
      } else {
        setError(result.error ?? "Assignment failed. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // STEP 1 — CHOOSE BLUEPRINT
  // ─────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="flex flex-col gap-0">
        {blueprints.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm font-medium">No published blueprints</p>
            <p className="text-gray-600 text-xs mt-1">
              Create and publish a blueprint in HQ → Blueprints first.
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search blueprints…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search blueprints"
                className="w-full bg-[#0a0b0c] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A24D]/40 transition-colors"
              />
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
              {filtered.length === 0 && search ? (
                <p className="text-gray-600 text-xs text-center py-8">
                  No blueprints match &ldquo;{search}&rdquo;
                </p>
              ) : (
                filtered.map((bp) => {
                  const isSelected = selectedId === bp.id;
                  return (
                    <button
                      key={bp.id}
                      onClick={() => setSelectedId(bp.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-left px-4 py-4 border transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A24D]/40 ${
                        isSelected
                          ? "border-[#C9A24D]/50 bg-[#C9A24D]/[0.06]"
                          : "border-white/[0.06] bg-[#0d0e0f] hover:border-white/[0.12] hover:bg-[#101213]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-semibold leading-tight">
                              {bp.name}
                            </span>
                            {isSelected && (
                              <span className="text-[#C9A24D] text-[10px] font-bold">✓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-[#C9A24D]/70 bg-[#C9A24D]/[0.08] px-1.5 py-0.5 font-medium">
                              {CATEGORY_LABEL[bp.category] ?? bp.category}
                            </span>
                            <span className="text-gray-500 text-[10px]">
                              {EXP_LABEL[bp.experienceLevel] ?? bp.experienceLevel}
                            </span>
                            {bp.recommendedDaysPerWeek && (
                              <>
                                <span className="text-gray-700">·</span>
                                <span className="text-gray-500 text-[10px]">
                                  {bp.recommendedDaysPerWeek}d/wk
                                </span>
                              </>
                            )}
                          </div>
                          {bp.description && (
                            <p className="text-gray-600 text-[10px] mt-1.5 line-clamp-1 leading-relaxed">
                              {bp.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {bp.defaultDurationWeeks && (
                            <p className="text-[#C9A24D] text-sm font-bold leading-tight">
                              {bp.defaultDurationWeeks}w
                            </p>
                          )}
                          {bp.estimatedWeeklyMinutes && (
                            <p className="text-gray-600 text-[9px] mt-0.5">
                              ~{bp.estimatedWeeklyMinutes}m/wk
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // STEP 2 — SET SCHEDULE
  // ─────────────────────────────────────────────────────────

  function renderStep2() {
    if (!selected) return null;
    return (
      <div className="space-y-6">
        {/* Selected blueprint summary */}
        <div className="bg-[#0a0b0c] border border-white/[0.06] px-4 py-3">
          <p className="text-white font-semibold text-sm">{selected.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-[#C9A24D]/70 bg-[#C9A24D]/[0.08] px-1.5 py-0.5">
              {CATEGORY_LABEL[selected.category] ?? selected.category}
            </span>
            <span className="text-gray-500 text-[10px]">
              {EXP_LABEL[selected.experienceLevel] ?? selected.experienceLevel}
            </span>
            {selected.defaultDurationWeeks && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-gray-500 text-[10px]">
                  {selected.defaultDurationWeeks} weeks
                </span>
              </>
            )}
          </div>
        </div>

        {/* Start date */}
        <div>
          <label
            htmlFor="assign-start-date"
            className="text-[9px] text-gray-400 uppercase tracking-[0.3em] block mb-2"
          >
            Start Date
          </label>
          <input
            id="assign-start-date"
            type="date"
            value={startDate}
            min={today()}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#0a0b0c] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A24D]/40 transition-colors"
          />
          <p className="text-gray-600 text-[10px] mt-1.5">Default: next Monday</p>
        </div>

        {/* Calculated end date */}
        {startDate && (
          <div className="grid grid-cols-2 gap-4">
            {selected.defaultDurationWeeks && (
              <div className="bg-[#0a0b0c] border border-white/[0.05] px-4 py-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em]">Duration</p>
                <p className="text-white text-lg font-bold mt-1">
                  {selected.defaultDurationWeeks} weeks
                </p>
              </div>
            )}
            {endDate && (
              <div className="bg-[#0a0b0c] border border-white/[0.05] px-4 py-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em]">
                  Projected End
                </p>
                <p className="text-white text-sm font-bold mt-1">{fmtDate(endDate)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // STEP 3 — PREVIEW & CONFIRM
  // ─────────────────────────────────────────────────────────

  function renderStep3() {
    if (!selected) return null;

    const trainingDays = selected.week1Preview;
    const trainingDayCount = trainingDays.length;

    return (
      <div className="space-y-6">
        {/* Assignment summary */}
        <div className="bg-[#0a0b0c] border border-white/[0.06] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-bold text-base leading-tight">{selected.name}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] text-[#C9A24D]/70 bg-[#C9A24D]/[0.08] px-1.5 py-0.5">
                  {CATEGORY_LABEL[selected.category] ?? selected.category}
                </span>
                <span className="text-gray-500 text-[10px]">
                  {EXP_LABEL[selected.experienceLevel] ?? selected.experienceLevel}
                </span>
              </div>
            </div>
            {selected.defaultDurationWeeks && (
              <div className="text-right shrink-0">
                <p className="text-[#C9A24D] text-xl font-bold">{selected.defaultDurationWeeks}</p>
                <p className="text-gray-500 text-[9px] uppercase tracking-[0.2em]">weeks</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">Starts</p>
              <p className="text-white text-xs font-semibold mt-0.5">{fmtDate(startDate)}</p>
            </div>
            {endDate && (
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">Ends</p>
                <p className="text-white text-xs font-semibold mt-0.5">{fmtDate(endDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Week 1 schedule */}
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mb-3">
            Week 1 Schedule
          </p>
          <div className="grid grid-cols-7 gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
              const day = trainingDays.find((d) => d.dayOfWeek === dow);
              return (
                <div
                  key={dow}
                  className={`border px-1 py-2.5 text-center min-h-[68px] flex flex-col ${
                    day
                      ? "border-[#C9A24D]/25 bg-[#C9A24D]/[0.05]"
                      : "border-white/[0.04] bg-[#0a0b0c]"
                  }`}
                >
                  <p className="text-[8px] text-gray-500 uppercase tracking-[0.15em]">
                    {DAY_LETTER[dow]}
                  </p>
                  <div className="flex-1 flex items-center justify-center mt-1">
                    {day ? (
                      <p className="text-[8px] text-white/75 leading-tight text-center break-all line-clamp-3">
                        {day.workoutName}
                      </p>
                    ) : (
                      <p className="text-[8px] text-gray-700">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <p className="text-gray-500 text-[10px]">
              {trainingDayCount} training day{trainingDayCount !== 1 ? "s" : ""} / week
            </p>
            {selected.estimatedWeeklyMinutes && (
              <>
                <span className="text-gray-700 text-[10px]">·</span>
                <p className="text-gray-500 text-[10px]">
                  ~{selected.estimatedWeeklyMinutes} min/week
                </p>
              </>
            )}
          </div>

          {trainingDays.length === 0 && (
            <p className="text-amber-400/70 text-[10px] mt-2">
              Week 1 has no workouts assigned yet. You can still assign the program.
            </p>
          )}
        </div>

        {/* Replace warning */}
        {hasActiveProgram && (
          <div className="border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-[0.12em]">
                  Replacing Current Program
                </p>
                {activeProgramName && (
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    Current: <span className="text-white">{activeProgramName}</span>
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
                  The active program will be archived. Historical workouts remain intact.
                </p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={confirmReplace}
                    onChange={(e) => setConfirmReplace(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#C9A24D] cursor-pointer"
                  />
                  <span className="text-gray-400 text-xs group-hover:text-gray-200 transition-colors">
                    I understand — proceed with replacement
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-500/25 bg-red-500/[0.05] px-4 py-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION
  // ─────────────────────────────────────────────────────────

  function renderNav() {
    const canProceed1 = !!selectedId && blueprints.length > 0;
    const canProceed2 = !!startDate;
    const canConfirm = !hasActiveProgram || confirmReplace;

    if (success) return null;

    return (
      <div className="flex items-center justify-between pt-5 border-t border-white/[0.06] mt-6">
        {step > 1 ? (
          <button
            onClick={handleBack}
            disabled={loading}
            className="text-[10px] text-gray-500 uppercase tracking-[0.2em] hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            ← Back
          </button>
        ) : (
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-[10px] text-gray-500 uppercase tracking-[0.2em] hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        )}

        {step < 3 && (
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && !canProceed1) || (step === 2 && !canProceed2) || loading
            }
            className="bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] uppercase tracking-[0.3em] font-semibold px-5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {step === 1 ? "Next — Schedule →" : "Next — Preview →"}
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleAssign}
            disabled={!canConfirm || loading}
            className={`text-[10px] uppercase tracking-[0.3em] font-bold px-6 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24D]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1011] ${
              canConfirm && !loading
                ? "bg-[#C9A24D] text-black hover:bg-[#C9A24D]/90"
                : "bg-white/[0.04] text-gray-600 cursor-not-allowed"
            } ${loading ? "opacity-60" : ""}`}
          >
            {loading ? "Assigning…" : "Assign Program"}
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // SUCCESS STATE
  // ─────────────────────────────────────────────────────────

  function renderSuccess() {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
          <span className="text-emerald-400 text-xl">✓</span>
        </div>
        <p className="text-white font-bold text-base mb-1">Program Assigned</p>
        <p className="text-gray-500 text-sm">
          {selected?.name} starts {fmtDate(startDate)}.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assign Program"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-xl bg-[#0f1011] border border-white/[0.08] shadow-2xl max-h-[90vh] flex flex-col"
        style={{ boxShadow: "0 0 0 1px rgba(201,162,77,0.06), 0 32px 64px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-[11px] text-[#C9A24D]/60 uppercase tracking-[0.5em] font-semibold mb-1">
              {hasActiveProgram ? "Replace Program" : "Assign Program"}
            </h2>
            {!success && (
              <p className="text-gray-500 text-xs">
                {step === 1 && "Choose a blueprint to assign"}
                {step === 2 && "Set the program start date"}
                {step === 3 && "Review and confirm the assignment"}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
            className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40 text-lg leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2">
          {success ? (
            renderSuccess()
          ) : (
            <>
              <StepIndicator step={step} />
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </>
          )}
        </div>

        {/* Footer nav */}
        {!success && <div className="px-6 pb-6 shrink-0">{renderNav()}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DAY NAME EXPORT (used by ProgramTimeline)
// ─────────────────────────────────────────────────────────────
export { DAY_ABBR };
