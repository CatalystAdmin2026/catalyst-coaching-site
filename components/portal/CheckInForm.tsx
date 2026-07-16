"use client";

// ─────────────────────────────────────────────────────────────
// Catalyst Portal — Weekly Check-In Form
//
// Client Component. Manages local state for all 4 sections:
//   1. Body (weight, waist)
//   2. Recovery (sleep, stress, energy, hunger, digestion)
//   3. Habits (water, steps, workout compliance, nutrition compliance)
//   4. Reflection (wins, challenges, questions, notes)
//
// Auto-saves draft to the DB on every field change (debounced 800ms).
// Submit is an explicit action after all desired fields are filled.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDraftCheckInAction,
  submitCheckInAction,
} from "@/app/portal/check-ins/actions";
import type { CheckInDraftData } from "@/lib/db/check-in-service";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface FormState {
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
  initialData?: Partial<FormState>;
  existingCheckInId?: string;
  weekStartDate: string;
}

// ─────────────────────────────────────────────────────────────
// SHARED FIELD COMPONENTS
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

function NumberInput({
  value,
  onChange,
  placeholder,
  step,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: string;
  min?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step ?? "any"}
      min={min ?? "0"}
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
  const fillPct =
    value !== null ? ((value - min) / (max - min)) * 100 : 0;

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
      {/* Tap-to-set grid for mobile friendliness */}
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
// MAIN FORM
// ─────────────────────────────────────────────────────────────

const EMPTY_STATE: FormState = {
  bodyWeightLbs: "",
  waistInches: "",
  averageSleepHours: "",
  averageStress: null,
  averageEnergy: null,
  averageHunger: null,
  digestionRating: null,
  averageWaterOunces: "",
  averageSteps: "",
  workoutCompliancePct: null,
  nutritionCompliancePct: null,
  wins: "",
  challenges: "",
  questions: "",
  clientNotes: "",
};

export default function CheckInForm({ initialData, existingCheckInId, weekStartDate }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...EMPTY_STATE,
    ...initialData,
  });

  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkInId, setCheckInId] = useState<string | undefined>(existingCheckInId);
  const [isPendingSave, startSaveTx] = useTransition();
  const [isPendingSubmit, startSubmitTx] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formToServiceData = (f: FormState): CheckInDraftData => ({
    bodyWeightLbs: f.bodyWeightLbs || null,
    waistInches: f.waistInches || null,
    averageSleepHours: f.averageSleepHours || null,
    averageStress: f.averageStress,
    averageEnergy: f.averageEnergy,
    averageHunger: f.averageHunger,
    digestionRating: f.digestionRating,
    averageWaterOunces: f.averageWaterOunces ? Number(f.averageWaterOunces) : null,
    averageSteps: f.averageSteps ? Number(f.averageSteps) : null,
    workoutCompliancePct: f.workoutCompliancePct,
    nutritionCompliancePct: f.nutritionCompliancePct,
    wins: f.wins || null,
    challenges: f.challenges || null,
    questions: f.questions || null,
    clientNotes: f.clientNotes || null,
  });

  const scheduleDraftSave = useCallback(
    (nextForm: FormState) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startSaveTx(async () => {
          const result = await saveDraftCheckInAction(formToServiceData(nextForm));
          if (result.ok) {
            setCheckInId(result.checkInId);
            setSavedAt(new Date());
            setSaveError(null);
          } else {
            setSaveError(result.error ?? "Failed to save draft.");
          }
        });
      }, 800);
    },
    [],
  );

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        scheduleDraftSave(next);
        return next;
      });
    },
    [scheduleDraftSave],
  );

  const handleSubmit = () => {
    if (!checkInId) {
      // First save the draft, then submit
      startSubmitTx(async () => {
        const saveResult = await saveDraftCheckInAction(formToServiceData(form));
        if (!saveResult.ok) {
          setSaveError(saveResult.error ?? "Failed to save draft.");
          return;
        }
        const id = saveResult.checkInId!;
        setCheckInId(id);
        const submitResult = await submitCheckInAction(id);
        if (submitResult.ok) {
          setSubmitted(true);
          router.push("/portal/check-ins");
        } else {
          setSaveError(submitResult.error ?? "Failed to submit check-in.");
        }
      });
    } else {
      startSubmitTx(async () => {
        // Flush any pending draft save first
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
          await saveDraftCheckInAction(formToServiceData(form));
        }
        const result = await submitCheckInAction(checkInId);
        if (result.ok) {
          setSubmitted(true);
          router.push("/portal/check-ins");
        } else {
          setSaveError(result.error ?? "Failed to submit check-in.");
        }
      });
    }
  };

  const weekLabel = new Date(weekStartDate + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-400 text-lg">✓</span>
        </div>
        <p className="text-white font-semibold">Check-in submitted</p>
        <p className="text-gray-500 text-sm mt-1">Your coach will respond soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Week header */}
      <div className="border-b border-white/[0.06] pb-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em]">
          Week of {weekLabel}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Fill in what you tracked. Leave anything blank that you didn&apos;t log.
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
              min="0"
            />
          </div>
          <div>
            <FieldLabel optional>Waist (inches)</FieldLabel>
            <NumberInput
              value={form.waistInches}
              onChange={(v) => setField("waistInches", v)}
              placeholder="34.0"
              step="0.25"
              min="0"
            />
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
            />
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

      {/* Save status */}
      <div className="text-[10px] text-gray-600">
        {isPendingSave && <span>Saving…</span>}
        {!isPendingSave && savedAt && (
          <span>
            Draft saved at{" "}
            {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {saveError && (
          <span className="text-red-400">{saveError}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPendingSubmit || isPendingSave}
          className="flex-1 bg-[#C9A24D] text-black text-sm font-bold uppercase tracking-[0.2em] px-6 py-3 hover:bg-[#d4af63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPendingSubmit ? "Submitting…" : "Submit Check-In"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/portal/check-ins")}
          className="sm:w-auto text-gray-500 text-sm hover:text-gray-300 transition-colors border border-white/[0.08] px-5 py-3"
        >
          Save &amp; Exit
        </button>
      </div>

      <p className="text-[10px] text-gray-600 pb-4">
        Your draft is automatically saved as you type. You can come back and finish later.
      </p>
    </div>
  );
}
