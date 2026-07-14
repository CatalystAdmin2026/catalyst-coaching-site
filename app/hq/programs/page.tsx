"use client";

// Catalyst HQ — Programs
// Auth: HQ layout (requireCoachOrAdminPage) — no secondary gate needed.

import { useState, useEffect } from "react";
import Link from "next/link";
import HQPageHeader from "@/components/hq/HQPageHeader";

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string;
  experienceLevel: string;
  recommendedDaysPerWeek: number | null;
  defaultDurationWeeks: number | null;
  createdAt: string;
}

const CATEGORIES = [
  "fat_loss", "muscle_growth", "body_recomposition",
  "athletic_performance", "lifestyle", "competition_prep",
  "executive_performance",
] as const;

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "competitive", "mixed"] as const;

function statusCls(s: string) {
  if (s === "active") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (s === "archived") return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
}

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HQProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "muscle_growth" as (typeof CATEGORIES)[number],
    experienceLevel: "intermediate" as (typeof EXPERIENCE_LEVELS)[number],
    defaultDurationWeeks: "12",
    recommendedDaysPerWeek: "4",
  });

  useEffect(() => {
    let mounted = true;
    fetch("/api/internal/programs")
      .then((r) => r.json())
      .then((data: { ok: boolean; templates?: ProgramRow[]; error?: string }) => {
        if (!mounted) return;
        if (data.ok && data.templates) setPrograms(data.templates);
        else setError(data.error ?? "Failed to load");
        setLoading(false);
      })
      .catch(() => { if (mounted) { setError("Network error"); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setCreateError("Name is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/internal/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          experienceLevel: form.experienceLevel,
          defaultDurationWeeks: form.defaultDurationWeeks ? parseInt(form.defaultDurationWeeks, 10) : null,
          recommendedDaysPerWeek: form.recommendedDaysPerWeek ? parseInt(form.recommendedDaysPerWeek, 10) : null,
        }),
      });
      const data = await res.json() as { ok: boolean; template?: { id: string }; error?: string };
      if (data.ok && data.template) {
        window.location.href = `/hq/programs/${data.template.id}`;
      } else {
        setCreateError(data.error ?? "Failed to create");
        setCreating(false);
      }
    } catch {
      setCreateError("Network error");
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete program "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/internal/programs/${id}`, { method: "DELETE" });
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <HQPageHeader
        title="Programs"
        subtitle="Design and assign multi-week coaching programs."
        action={
          <button
            onClick={() => { setShowForm(true); setCreateError(null); }}
            className="bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.3em] uppercase px-4 py-2 hover:bg-[#D4B56A] transition-colors"
          >
            New Program
          </button>
        }
      />

      {showForm && (
        <div className="mb-8 bg-[#0d0e0f] border border-[#C9A24D]/30 p-6">
          <p className="text-white font-semibold text-sm mb-5 tracking-wide">New Training Program</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">Program Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hypertrophy Block A – 12 Week"
                  className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50 placeholder-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))}
                  className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{fmtLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">Experience Level *</label>
                <select
                  value={form.experienceLevel}
                  onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value as typeof form.experienceLevel }))}
                  className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50"
                >
                  {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{fmtLabel(l)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">Duration (weeks)</label>
                <input
                  type="number"
                  value={form.defaultDurationWeeks}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDurationWeeks: e.target.value }))}
                  placeholder="12"
                  className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50 placeholder-gray-700"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">Days / Week</label>
                <input
                  type="number"
                  value={form.recommendedDaysPerWeek}
                  onChange={(e) => setForm((f) => ({ ...f, recommendedDaysPerWeek: e.target.value }))}
                  placeholder="4"
                  className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50 placeholder-gray-700"
                />
              </div>
            </div>
            {createError && <p className="text-red-400 text-xs">{createError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.3em] uppercase px-5 py-2.5 hover:bg-[#D4B56A] transition-colors disabled:opacity-50">
                {creating ? "Creating…" : "Create Program"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 text-[11px] hover:text-gray-400 transition-colors px-3">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] tracking-[0.4em] text-gray-600 uppercase font-semibold">Training Programs</span>
        {!loading && <span className="text-[10px] text-gray-700">{programs.length} {programs.length === 1 ? "program" : "programs"}</span>}
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>

      {loading && (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white/[0.02] animate-pulse" />)}</div>
      )}
      {error && <div className="bg-red-500/[0.05] border border-red-500/20 px-4 py-3 text-red-400 text-sm">{error}</div>}
      {!loading && !error && programs.length === 0 && (
        <div className="border border-white/[0.06] border-dashed px-8 py-12 text-center">
          <p className="text-gray-600 text-sm mb-2">No training programs yet</p>
          <p className="text-gray-700 text-xs">
            Click{" "}
            <button onClick={() => setShowForm(true)} className="text-[#C9A24D] hover:text-[#D4B56A]">
              New Program
            </button>{" "}
            to build your first multi-week program.
          </p>
        </div>
      )}
      {!loading && programs.length > 0 && (
        <div className="space-y-2">
          {programs.map((p) => (
            <div key={p.id} className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:border-white/10 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-white font-semibold text-sm">{p.name}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${statusCls(p.status)}`}>
                    {p.status === "active" ? "Published" : p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-gray-600 text-[11px]">{fmtLabel(p.category)}</span>
                  <span className="text-gray-700 text-[11px]">·</span>
                  <span className="text-gray-600 text-[11px]">{fmtLabel(p.experienceLevel)}</span>
                  {p.defaultDurationWeeks && <><span className="text-gray-700 text-[11px]">·</span><span className="text-gray-600 text-[11px]">{p.defaultDurationWeeks}w</span></>}
                  {p.recommendedDaysPerWeek && <><span className="text-gray-700 text-[11px]">·</span><span className="text-gray-600 text-[11px]">{p.recommendedDaysPerWeek}d/wk</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-700 text-[11px]">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <Link
                  href={`/hq/programs/${p.id}`}
                  className="text-[10px] tracking-[0.25em] uppercase font-semibold text-gray-500 border border-white/[0.08] px-3 py-1.5 hover:text-white hover:border-white/20 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-700 border border-white/[0.05] px-3 py-1.5 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
