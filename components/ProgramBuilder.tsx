"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// TYPES (mirror API response)
// ─────────────────────────────────────────────────────────────

interface ProgramTemplate {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string;
  experienceLevel: string;
  recommendedDaysPerWeek: number | null;
  defaultDurationWeeks: number | null;
  description: string | null;
  createdAt: string;
}

interface DayData {
  day: {
    id: string;
    programWeekId: string;
    dayOfWeek: number;
    workoutTemplateId: string | null;
    label: string | null;
    notes: string | null;
  };
  workoutName: string | null;
  workoutStatus: string | null;
}

interface WeekData {
  week: {
    id: string;
    weekNumber: number;
    label: string | null;
    notes: string | null;
  };
  days: DayData[];
}

export interface ProgramBuilderData {
  template: ProgramTemplate;
  weeks: WeekData[];
}

interface BlueprintOption {
  id: string;
  name: string;
  status: string;
  primaryFocus: string | null;
  estimatedDurationMinutes: number | null;
}

// Coach dashboard assignment shape
interface ClientOption {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function statusCls(s: string) {
  if (s === "active") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (s === "archived") return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
}

function statusLabel(s: string) {
  if (s === "active") return "Published";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────
// DAY CELL COMPONENT
// ─────────────────────────────────────────────────────────────

function DayCell({
  day,
  weekId,
  templateId,
  blueprints,
  onUpdate,
}: {
  day: DayData | undefined;
  weekId: string;
  templateId: string;
  blueprints: BlueprintOption[];
  onUpdate: (dayOfWeek: number, updated: DayData | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayOfWeek = day?.day.dayOfWeek ?? -1;
  const hasWorkout = !!day?.day.workoutTemplateId;

  async function handleSelect(workoutTemplateId: string | null, name: string | null) {
    if (dayOfWeek === -1) return;
    setSaving(true);
    setOpen(false);
    try {
      const res = await fetch(
        `/api/internal/programs/${templateId}/weeks/${weekId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek,
            workoutTemplateId,
            clear: workoutTemplateId === null,
          }),
        },
      );
      const data = await res.json() as { ok: boolean; day?: DayData["day"] };
      if (data.ok) {
        if (workoutTemplateId === null) {
          onUpdate(dayOfWeek, null);
        } else {
          const blueprint = blueprints.find((b) => b.id === workoutTemplateId);
          onUpdate(dayOfWeek, {
            day: data.day ?? {
              id: "",
              programWeekId: weekId,
              dayOfWeek,
              workoutTemplateId,
              label: null,
              notes: null,
            },
            workoutName: name,
            workoutStatus: blueprint?.status ?? null,
          });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      {saving ? (
        <div className="h-16 bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <div className="w-3 h-3 border border-[#C9A24D]/40 border-t-[#C9A24D] rounded-full animate-spin" />
        </div>
      ) : hasWorkout ? (
        <button
          onClick={() => setOpen((x) => !x)}
          className="w-full h-16 bg-[#C9A24D]/[0.06] border border-[#C9A24D]/20 px-2 text-left hover:bg-[#C9A24D]/10 transition-colors"
        >
          <p className="text-[#C9A24D] text-[10px] font-semibold truncate leading-tight">
            {day?.workoutName}
          </p>
          {day?.day.label && (
            <p className="text-gray-600 text-[9px] truncate">{day.day.label}</p>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen((x) => !x)}
          className="w-full h-16 bg-[#080909] border border-dashed border-white/[0.06] flex items-center justify-center hover:border-white/20 hover:bg-white/[0.02] transition-colors text-gray-700 text-[10px]"
        >
          + Rest
        </button>
      )}

      {open && (
        <div className="absolute z-20 top-[68px] left-0 min-w-[220px] bg-[#111213] border border-white/[0.12] shadow-xl">
          {hasWorkout && (
            <button
              onClick={() => handleSelect(null, null)}
              className="w-full text-left px-3 py-2 text-[11px] text-gray-600 hover:text-red-400 border-b border-white/[0.05] transition-colors"
            >
              Remove workout (make rest day)
            </button>
          )}
          {blueprints.length === 0 && (
            <p className="text-gray-700 text-[11px] px-3 py-3">
              No published blueprints available.
            </p>
          )}
          {blueprints.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id, b.name)}
              className={`w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0 ${
                day?.day.workoutTemplateId === b.id ? "bg-[#C9A24D]/[0.06]" : ""
              }`}
            >
              <p className="text-white text-[11px] font-medium">{b.name}</p>
              {b.primaryFocus && (
                <p className="text-gray-600 text-[10px]">{b.primaryFocus}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WEEK ROW COMPONENT
// ─────────────────────────────────────────────────────────────

function WeekRow({
  weekData,
  templateId,
  blueprints,
  onUpdateDay,
  onDelete,
  onUpdateLabel,
}: {
  weekData: WeekData;
  templateId: string;
  blueprints: BlueprintOption[];
  onUpdateDay: (weekId: string, dayOfWeek: number, data: DayData | null) => void;
  onDelete: (weekId: string) => void;
  onUpdateLabel: (weekId: string, label: string) => void;
}) {
  const { week, days } = weekData;
  const [editLabel, setEditLabel] = useState(false);
  const [labelInput, setLabelInput] = useState(week.label ?? `Week ${week.weekNumber}`);
  const [savingLabel, setSavingLabel] = useState(false);

  const dayMap = new Map(days.map((d) => [d.day.dayOfWeek, d]));

  async function handleSaveLabel() {
    setSavingLabel(true);
    try {
      await fetch(`/api/internal/programs/${templateId}/weeks/${week.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelInput }),
      });
      onUpdateLabel(week.id, labelInput);
      setEditLabel(false);
    } finally {
      setSavingLabel(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete Week ${week.weekNumber}? All day assignments in this week will be lost.`)) return;
    await fetch(`/api/internal/programs/${templateId}/weeks/${week.id}`, { method: "DELETE" });
    onDelete(week.id);
  }

  return (
    <div className="border border-white/[0.06] bg-[#0d0e0f] mb-3">
      {/* Week header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04]">
        <span className="text-gray-600 text-[10px] font-semibold tracking-[0.4em] uppercase shrink-0">
          W{week.weekNumber}
        </span>
        {editLabel ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabel(); if (e.key === "Escape") setEditLabel(false); }}
              className="flex-1 bg-[#080909] border border-white/[0.08] text-white px-2 py-1 text-xs focus:outline-none focus:border-[#C9A24D]/40"
            />
            <button onClick={handleSaveLabel} disabled={savingLabel} className="text-[10px] bg-[#C9A24D] text-black font-bold px-2 py-1 hover:bg-[#D4B56A] transition-colors disabled:opacity-50">
              {savingLabel ? "…" : "Save"}
            </button>
            <button onClick={() => setEditLabel(false)} className="text-[10px] text-gray-600 hover:text-gray-400">Cancel</button>
          </div>
        ) : (
          <>
            <button onClick={() => setEditLabel(true)} className="flex-1 text-left text-white text-xs font-medium hover:text-gray-300 transition-colors">
              {week.label ?? `Week ${week.weekNumber}`}
            </button>
            <button onClick={handleDelete} className="text-[10px] text-gray-700 hover:text-red-400 transition-colors ml-2">×</button>
          </>
        )}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
          <div key={dow}>
            <p className="text-gray-700 text-[9px] text-center uppercase tracking-[0.2em] mb-1">
              {DAY_LABELS[dow]}
            </p>
            <DayCell
              day={dayMap.get(dow)}
              weekId={week.id}
              templateId={templateId}
              blueprints={blueprints}
              onUpdate={(d, updated) => {
                if (updated === null) {
                  onUpdateDay(week.id, d, null);
                } else {
                  onUpdateDay(week.id, d, updated);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ASSIGN TO CLIENT PANEL
// ─────────────────────────────────────────────────────────────

function AssignPanel({ templateId }: { templateId: string }) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [coachNotes, setCoachNotes] = useState("");
  const [override, setOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadClients = useCallback(async () => {
    if (clients.length > 0) return;
    setLoadingClients(true);
    try {
      // Fetch all users from the existing clients endpoint
      const res = await fetch("/api/internal/client-programs");
      const data = await res.json() as { ok: boolean; assignments?: { assignment: { clientId: string }; clientName: string }[] };
      if (data.ok && data.assignments) {
        const seen = new Set<string>();
        const opts: ClientOption[] = [];
        for (const a of data.assignments) {
          if (!seen.has(a.assignment.clientId)) {
            seen.add(a.assignment.clientId);
            opts.push({ id: a.assignment.clientId, name: a.clientName });
          }
        }
        setClients(opts);
      }
    } finally {
      setLoadingClients(false);
    }
  }, [clients.length]);

  async function handleAssign() {
    if (!clientId || !startDate) { setResult({ ok: false, msg: "Client and start date are required" }); return; }
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/internal/client-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          programTemplateId: templateId,
          startDate,
          coachNotes: coachNotes || null,
          overrideAllowMultiple: override,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      setResult({ ok: data.ok, msg: data.ok ? "Program assigned successfully." : (data.error ?? "Failed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-white/[0.08] bg-[#0d0e0f] p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold">Assign to Client</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onFocus={loadClients}
            placeholder="Paste client UUID or select below"
            list="client-options"
            className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2 text-xs focus:outline-none focus:border-[#C9A24D]/40 placeholder-gray-700"
          />
          <datalist id="client-options">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </datalist>
          {loadingClients && <p className="text-gray-700 text-[10px] mt-1">Loading active clients…</p>}
        </div>
        <div>
          <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1">Program Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2 text-xs focus:outline-none focus:border-[#C9A24D]/40"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1">Coach Notes</label>
          <input
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            placeholder="Internal notes for this assignment"
            className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2 text-xs focus:outline-none focus:border-[#C9A24D]/40 placeholder-gray-700"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="accent-[#C9A24D]" />
        <span className="text-gray-500 text-xs">Allow multiple active programs (override)</span>
      </label>

      {result && (
        <p className={`text-xs mt-3 ${result.ok ? "text-emerald-400" : "text-red-400"}`}>{result.msg}</p>
      )}

      <button
        onClick={handleAssign}
        disabled={saving}
        className="mt-4 bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.25em] uppercase px-5 py-2.5 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
      >
        {saving ? "Assigning…" : "Assign Program"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VALIDATION PANEL
// ─────────────────────────────────────────────────────────────

function ValidationPanel({ templateId, onPublish }: { templateId: string; onPublish: () => void }) {
  const [errors, setErrors] = useState<string[] | null>(null);
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    setErrors(null);
    try {
      const res = await fetch(`/api/internal/programs/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      const data = await res.json() as { ok: boolean; errors?: string[] };
      if (data.ok) {
        onPublish();
      } else {
        setErrors(data.errors ?? ["Unknown validation failure"]);
      }
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="border border-white/[0.08] bg-[#0d0e0f] p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold">Publish Program</p>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="text-[10px] tracking-[0.25em] uppercase font-semibold bg-[#C9A24D] text-black px-4 py-2 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
        >
          {publishing ? "Validating…" : "Validate & Publish"}
        </button>
      </div>

      <p className="text-gray-700 text-xs mb-3">
        Publishing validates that every assigned blueprint is published and passes structural checks.
        Only published programs can be assigned to clients.
      </p>

      {errors && errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-500/[0.04] border border-red-500/15 px-3 py-2">
              <span className="text-red-400 text-xs shrink-0">✗</span>
              <p className="text-red-400/80 text-xs">{e}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN BUILDER
// ─────────────────────────────────────────────────────────────

interface Props {
  templateId: string;
  initialData: ProgramBuilderData;
  blueprints: BlueprintOption[];
}

export default function ProgramBuilder({ templateId, initialData, blueprints }: Props) {
  const [template, setTemplate] = useState(initialData.template);
  const [weeks, setWeeks] = useState(initialData.weeks);
  const [addingWeek, setAddingWeek] = useState(false);
  const [activePanel, setActivePanel] = useState<"schedule" | "assign">("schedule");

  function handleUpdateDay(weekId: string, dayOfWeek: number, data: DayData | null) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.week.id !== weekId) return w;
        const filtered = w.days.filter((d) => d.day.dayOfWeek !== dayOfWeek);
        if (data === null) return { ...w, days: filtered };
        return { ...w, days: [...filtered, data] };
      }),
    );
  }

  function handleDeleteWeek(weekId: string) {
    setWeeks((prev) => prev.filter((w) => w.week.id !== weekId));
  }

  function handleUpdateWeekLabel(weekId: string, label: string) {
    setWeeks((prev) =>
      prev.map((w) =>
        w.week.id === weekId ? { ...w, week: { ...w.week, label } } : w,
      ),
    );
  }

  async function handleAddWeek() {
    setAddingWeek(true);
    try {
      const res = await fetch(`/api/internal/programs/${templateId}/weeks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as {
        ok: boolean;
        week?: { id: string; weekNumber: number; label: string | null; notes: string | null };
      };
      if (data.ok && data.week) {
        setWeeks((prev) => [...prev, { week: data.week!, days: [] }]);
      }
    } finally {
      setAddingWeek(false);
    }
  }

  function handlePublish() {
    setTemplate((t) => ({ ...t, status: "active" }));
  }

  // Days used across all weeks for blueprint usage summary
  const assignedCount = weeks.reduce(
    (sum, w) => sum + w.days.filter((d) => d.day.workoutTemplateId).length,
    0,
  );

  return (
    <div className="min-h-screen bg-[#080909] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080909]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/admin/programs" className="text-gray-600 hover:text-gray-400 text-xs tracking-widest uppercase font-semibold transition-colors shrink-0">
                ← Programs
              </Link>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <h1 className="text-white font-semibold text-sm tracking-wide truncate">{template.name}</h1>
              <span className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-wide shrink-0 ${statusCls(template.status)}`}>
                {statusLabel(template.status)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-gray-600 text-[11px]">
              <span>{weeks.length}w · {assignedCount} workouts</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-6">
        {/* Nav tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
          {(["schedule", "assign"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePanel(p)}
              className={`px-4 py-2.5 text-[10px] uppercase tracking-[0.35em] font-semibold transition-colors border-b-2 -mb-px ${
                activePanel === p
                  ? "text-[#C9A24D] border-[#C9A24D]"
                  : "text-gray-600 border-transparent hover:text-gray-400"
              }`}
            >
              {p === "schedule" ? "Schedule" : "Assign to Client"}
            </button>
          ))}
        </div>

        {activePanel === "schedule" && (
          <>
            {/* Blueprint legend */}
            {blueprints.length > 0 && (
              <div className="mb-6 p-3 bg-[#0d0e0f] border border-white/[0.06]">
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.4em] mb-2">Published Blueprints Available</p>
                <div className="flex flex-wrap gap-2">
                  {blueprints.slice(0, 12).map((b) => (
                    <span key={b.id} className="text-[10px] text-gray-400 border border-white/[0.06] px-2 py-0.5">
                      {b.name}
                    </span>
                  ))}
                  {blueprints.length > 12 && (
                    <span className="text-[10px] text-gray-600">+{blueprints.length - 12} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 gap-1 mb-1 px-0">
              {DAY_FULL.map((d) => (
                <p key={d} className="text-gray-700 text-[10px] text-center uppercase tracking-[0.2em] pb-1">{d}</p>
              ))}
            </div>

            {/* Week rows */}
            {[...weeks]
              .sort((a, b) => a.week.weekNumber - b.week.weekNumber)
              .map((w) => (
                <WeekRow
                  key={w.week.id}
                  weekData={w}
                  templateId={templateId}
                  blueprints={blueprints}
                  onUpdateDay={handleUpdateDay}
                  onDelete={handleDeleteWeek}
                  onUpdateLabel={handleUpdateWeekLabel}
                />
              ))}

            {/* Add week */}
            <button
              onClick={handleAddWeek}
              disabled={addingWeek}
              className="w-full border border-dashed border-white/[0.08] px-5 py-4 text-gray-600 text-xs hover:text-gray-400 hover:border-white/[0.15] transition-colors disabled:opacity-50"
            >
              {addingWeek ? "Adding…" : "+ Add Week"}
            </button>

            {/* Validation / publish */}
            {template.status !== "active" && (
              <ValidationPanel templateId={templateId} onPublish={handlePublish} />
            )}
          </>
        )}

        {activePanel === "assign" && (
          <>
            {template.status !== "active" ? (
              <div className="border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 text-amber-400 text-sm">
                This program must be published before it can be assigned to clients.
                <br />
                <span className="text-xs text-amber-400/60">Switch to the Schedule tab and click Validate & Publish.</span>
              </div>
            ) : (
              <AssignPanel templateId={templateId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
