"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst Portal — Edit Submitted Check-In Form
//
// Client Component. Allows a client to correct a submitted
// check-in while its status is still 'submitted'.
//
// Unlike CheckInForm:
//   - No auto-save. Changes commit only on explicit "Save".
//   - Calls editSubmittedCheckInAction (not saveDraftCheckInAction).
//   - On success, redirects to the detail view with ?edited=1.
//   - Shows a race-condition error if the coach starts reviewing
//     while the client has the form open.
// ─────────────────────────────────────────────────────────────

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editSubmittedCheckInAction } from "@/app/portal/check-ins/actions";
import type { CheckInDraftData } from "@/lib/db/check-in-service";
import {
  validateCheckInDraft,
  hasFieldErrors,
  type CheckInFieldErrors,
} from "@/lib/db/check-in-validation";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface EditFormInitialData {
  bodyWeightLbs: string;
  waistInches: string;
  averageSleepHours: string;
  averageStress: number | null;
  averageEnergy: number | null;
  averageHunger: number | null;
  digestionRating: number | null;
  averageWaterOunces: string;
  averageSteps: string;
  workoutCompliancePct: number | null;
  nutritionCompliancePct: number | null;
  wins: string;
  challenges: string;
  questions: string;
  clientNotes: string;
}

interface Props {
  checkInId: string;
  initialData: EditFormInitialData;
  weekStartDate: string;
  submittedAt: Date | null;
}

// ─────────────────────────────────────────────────────────────
// SHARED FIELD COMPONENTS (duplicated from CheckInForm to keep
// the two forms independently evolvable without a shared import)
// ─────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block text-[10px] text-gray-400 uppercase tracking-[0.3em] mb-1.5">
      {children}
      {optional && (
        <span className="ml-2 normal-case text-gray-600 tracking-normal">optional</span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-red-400 text-[10px] mt-1.5 leading-tight">{message}</p>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step ?? "any"}
      min={min}
      max={max}
      className="w-full bg-[#0d0e0f] border border-white/[0.09] text-white text-sm px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-[#C9A24D]/40 transition-colors"
    />
  );
}

function RatingSlider({
  value,
  onChange,
  label,
  min = 1,
  max = 10,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}) {
  const display = value !== null ? String(value) : "—";
  const fillPct = value !== null ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel optional>{label}</FieldLabel>
        <span
          className={`text-sm font-bold tabular-nums ${
            value !== null ? "text-[#C9A24D]" : "text-gray-600"
          }`}
        >
          {display}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {lowLabel && (
          <span className="text-[9px] text-gray-600 shrink-0 w-12">{lowLabel}</span>
        )}
        <div className="relative flex-1 h-6 flex items-center">
          <div className="w-full h-1 bg-white/[0.06] relative">
            {value !== null && (
              <div
                className="absolute left-0 top-0 h-full bg-[#C9A24D]/60"
                style={{ width: `${fillPct}%` }}
              />
            )}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value ?? min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label={label}
          />
        </div>
        {highLabel && (
          <span className="text-[9px] text-gray-600 shrink-0 w-12 text-right">
            {highLabel}
          </span>
        )}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-600 hover:text-gray-400 text-[10px] ml-1 shrink-0"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1 mt-2">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`h-6 text-[9px] font-medium transition-colors ${
              value === n
                ? "bg-[#C9A24D]/20 text-[#C9A24D] border border-[#C9A24D]/30"
                : "bg-white/[0.03] text-gray-600 hover:bg-white/[0.07] hover:text-gray-400 border border-transparent"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComplianceSlider({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  const fillPct = value !== null ? value : 0;
  const display = value !== null ? `${value}%` : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel optional>{label}</FieldLabel>
        <span
          className={`text-sm font-bold tabular-nums ${
            value !== null
              ? value >= 75
                ? "text-emerald-400"
                : value >= 50
                ? "text-amber-400"
                : "text-red-400"
              : "text-gray-600"
          }`}
        >
          {display}
        </span>
      </div>
      <div className="relative flex-1 h-6 flex items-center">
        <div className="w-full h-1 bg-white/[0.06] relative">
          {value !== null && (
            <div
              className={`absolute left-0 top-0 h-full ${
                value >= 75
                  ? "bg-emerald-500/50"
                  : value >= 50
                  ? "bg-amber-500/50"
                  : "bg-red-500/50"
              }`}
              style={{ width: `${fillPct}%` }}
            />
          )}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          onClick={() => { if (value === null) onChange(75); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[9px] text-gray-600 hover:text-gray-400 mt-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      className="w-full bg-[#0d0e0f] border border-white/[0.09] text-white text-sm px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-[#C9A24D]/40 transition-colors resize-none leading-relaxed"
    />
  );
}

function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-6 h-6 rounded-sm bg-[#C9A24D]/15 border border-[#C9A24D]/25 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-[#C9A24D] leading-none">{number}</span>
      </div>
      <div>
        <h2 className="text-white text-sm font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-gray-500 text-[11px] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function formToServiceData(f: EditFormInitialData): CheckInDraftData {
  return {
    bodyWeightLbs: f.bodyWeightLbs || null,
    waistInches: f.waistInches || null,
    averageSleepHours: f.averageSleepHours || null,
    averageStress: f.averageStress,
    averageEnergy: f.averageEnergy,
    averageHunger: f.averageHunger,
    digestionRating: f.digestionRating,
    averageWaterOunces: f.averageWaterOunces !== "" ? Number(f.averageWaterOunces) : null,
    averageSteps: f.averageSteps !== "" ? Number(f.averageSteps) : null,
    workoutCompliancePct: f.workoutCompliancePct,
    nutritionCompliancePct: f.nutritionCompliancePct,
    wins: f.wins || null,
    challenges: f.challenges || null,
    questions: f.questions || null,
    clientNotes: f.clientNotes || null,
  };
}

// ─────────────────────────────────────────────────────────────
// FORM
// ─────────────────────────────────────────────────────────────

export default function EditCheckInForm({
  checkInId,
  initialData,
  weekStartDate,
  submittedAt,
}: Props) {
  const router = useRouter();
  const [form, setFormState] = useState<EditFormInitialData>(initialData);
  const [fieldErrors, setFieldErrors] = useState<CheckInFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setField = <K extends keyof EditFormInitialData>(
    key: K,
    value: EditFormInitialData[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const serviceData = formToServiceData(form);
    const errors = validateCheckInDraft(serviceData);
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      setGeneralError("Please fix the errors below before saving.");
      return;
    }

    setFieldErrors({});
    setGeneralError(null);

    startTransition(async () => {
      const result = await editSubmittedCheckInAction(checkInId, serviceData);
      if (result.ok) {
        router.push(`/portal/check-ins/${checkInId}?edited=1`);
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
        setGeneralError(null);
      } else {
        setGeneralError(result.error ?? "Failed to save changes.");
      }
    });
  };

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const weekLabel = new Date(weekStartDate + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* Notice banner */}
      <div className="bg-blue-500/[0.05] border border-blue-500/20 px-4 py-3">
        <p className="text-blue-400 text-sm font-medium">Editing a submitted check-in</p>
        {submittedLabel && (
          <p className="text-blue-300/60 text-xs mt-0.5">
            Originally submitted {submittedLabel}. Your original submission date is preserved.
          </p>
        )}
      </div>

      {/* Week header */}
      <div className="border-b border-white/[0.06] pb-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em]">
          Week of {weekLabel}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Correct any values below, then click Save Changes.
        </p>
      </div>

      {/* Section 1: Body */}
      <section>
        <SectionHeader
          number={1}
          title="Body"
          subtitle="How did your body composition measurements trend this week?"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel optional>Weight (lbs)</FieldLabel>
            <NumberInput
              value={form.bodyWeightLbs}
              onChange={(v) => setField("bodyWeightLbs", v)}
              placeholder="185.0"
              step="0.1"
              min="0.1"
            />
            <FieldError message={fieldErrors.bodyWeightLbs} />
          </div>
          <div>
            <FieldLabel optional>Waist (inches)</FieldLabel>
            <NumberInput
              value={form.waistInches}
              onChange={(v) => setField("waistInches", v)}
              placeholder="34.0"
              step="0.25"
              min="0.25"
            />
            <FieldError message={fieldErrors.waistInches} />
          </div>
        </div>
      </section>

      {/* Section 2: Recovery */}
      <section>
        <SectionHeader
          number={2}
          title="Recovery"
          subtitle="Rate your average across the week, not just today."
        />
        <div className="space-y-5">
          <div>
            <FieldLabel optional>Average sleep (hours/night)</FieldLabel>
            <NumberInput
              value={form.averageSleepHours}
              onChange={(v) => setField("averageSleepHours", v)}
              placeholder="7.5"
              step="0.5"
              min="0"
              max="24"
            />
            <FieldError message={fieldErrors.averageSleepHours} />
          </div>
          <RatingSlider
            value={form.averageStress}
            onChange={(v) => setField("averageStress", v)}
            label="Stress level"
            lowLabel="1 — Calm"
            highLabel="10 — Maxed"
          />
          <RatingSlider
            value={form.averageEnergy}
            onChange={(v) => setField("averageEnergy", v)}
            label="Energy level"
            lowLabel="1 — Depleted"
            highLabel="10 — Peak"
          />
          <RatingSlider
            value={form.averageHunger}
            onChange={(v) => setField("averageHunger", v)}
            label="Hunger level"
            lowLabel="1 — Never hungry"
            highLabel="10 — Always starving"
          />
          <RatingSlider
            value={form.digestionRating}
            onChange={(v) => setField("digestionRating", v)}
            label="Digestion"
            lowLabel="1 — Poor"
            highLabel="10 — Great"
          />
        </div>
      </section>

      {/* Section 3: Habits */}
      <section>
        <SectionHeader
          number={3}
          title="Habits"
          subtitle="Track your daily averages for the week."
        />
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel optional>Water (oz/day avg)</FieldLabel>
              <NumberInput
                value={form.averageWaterOunces}
                onChange={(v) => setField("averageWaterOunces", v)}
                placeholder="80"
                step="8"
                min="0"
              />
              <FieldError message={fieldErrors.averageWaterOunces} />
            </div>
            <div>
              <FieldLabel optional>Steps (daily avg)</FieldLabel>
              <NumberInput
                value={form.averageSteps}
                onChange={(v) => setField("averageSteps", v)}
                placeholder="8000"
                step="500"
                min="0"
              />
              <FieldError message={fieldErrors.averageSteps} />
            </div>
          </div>
          <ComplianceSlider
            value={form.workoutCompliancePct}
            onChange={(v) => setField("workoutCompliancePct", v)}
            label="Workout compliance"
          />
          <ComplianceSlider
            value={form.nutritionCompliancePct}
            onChange={(v) => setField("nutritionCompliancePct", v)}
            label="Nutrition compliance"
          />
        </div>
      </section>

      {/* Section 4: Reflection */}
      <section>
        <SectionHeader
          number={4}
          title="Reflection"
          subtitle="Your coach reads every word. Be honest."
        />
        <div className="space-y-4">
          <div>
            <FieldLabel optional>Wins this week</FieldLabel>
            <Textarea
              value={form.wins}
              onChange={(v) => setField("wins", v)}
              placeholder="What went well? Workouts you're proud of, habits you nailed…"
              rows={3}
            />
          </div>
          <div>
            <FieldLabel optional>Challenges</FieldLabel>
            <Textarea
              value={form.challenges}
              onChange={(v) => setField("challenges", v)}
              placeholder="What was hard? Anything you struggled with or missed?"
              rows={3}
            />
          </div>
          <div>
            <FieldLabel optional>Questions for your coach</FieldLabel>
            <Textarea
              value={form.questions}
              onChange={(v) => setField("questions", v)}
              placeholder="Anything you want your coach to weigh in on?"
              rows={2}
            />
          </div>
          <div>
            <FieldLabel optional>Anything else</FieldLabel>
            <Textarea
              value={form.clientNotes}
              onChange={(v) => setField("clientNotes", v)}
              placeholder="Anything else on your mind?"
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* General error (race condition or server error) */}
      {generalError && (
        <div className="bg-red-500/[0.06] border border-red-500/20 px-4 py-3">
          <p className="text-red-400 text-sm">{generalError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 bg-[#C9A24D] text-black text-sm font-bold uppercase tracking-[0.2em] px-6 py-3 hover:bg-[#d4af63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/portal/check-ins/${checkInId}`)}
          className="sm:w-auto text-gray-500 text-sm hover:text-gray-300 transition-colors border border-white/[0.08] px-5 py-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
