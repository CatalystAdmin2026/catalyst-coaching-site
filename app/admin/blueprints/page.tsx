"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";

interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  recommendedExperienceLevel: string;
  primaryFocus: string | null;
  estimatedDurationMinutes: number | null;
  createdAt: string;
}

function statusCls(s: string) {
  if (s === "active") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (s === "archived") return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
}

function expCls(e: string) {
  if (e === "advanced") return "text-red-400";
  if (e === "intermediate") return "text-amber-400";
  return "text-emerald-400";
}

interface NewTemplateForm {
  name: string;
  recommendedExperienceLevel: string;
}

export default function BlueprintsPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewTemplateForm>({
    name: "",
    recommendedExperienceLevel: "intermediate",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/internal/workout-templates")
      .then((r) => r.json())
      .then((data: { ok: boolean; templates?: TemplateRow[]; error?: string }) => {
        if (!mounted) return;
        if (data.ok && data.templates) {
          setTemplates(data.templates);
        } else {
          setError(data.error ?? "Failed to load templates");
        }
        setLoading(false);
      })
      .catch(() => {
        if (mounted) { setError("Network error"); setLoading(false); }
      });
    return () => { mounted = false; };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim()) { setCreateError("Name is required"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/internal/workout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json() as { ok: boolean; template?: { id: string }; error?: string };
      if (data.ok && data.template) {
        window.location.href = `/admin/blueprints/${data.template.id}`;
      } else {
        setCreateError(data.error ?? "Failed to create template");
        setCreating(false);
      }
    } catch {
      setCreateError("Network error");
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete blueprint "${name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/internal/workout-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Failed to delete template");
    }
  }

  return (
    <AdminGate>
      <div className="min-h-screen bg-[#080909] text-white">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#080909]/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-400 text-xs tracking-widest uppercase font-semibold transition-colors"
                >
                  ← Dashboard
                </Link>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-[#C9A24D] rounded-sm" />
                  <p className="text-white font-semibold text-sm tracking-wide">
                    Workout Blueprint Builder
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowNewForm(true); setCreateError(null); }}
                className="bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.3em] uppercase px-4 py-2 hover:bg-[#D4B56A] transition-colors"
              >
                New Blueprint
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">

          {/* New Template Form */}
          {showNewForm && (
            <div className="mb-8 bg-[#0d0e0f] border border-[#C9A24D]/30 p-6">
              <p className="text-white font-semibold text-sm mb-5 tracking-wide">
                New Workout Blueprint
              </p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={newForm.name}
                      onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Push / Pull / Legs – Hypertrophy"
                      className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50 placeholder-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600 uppercase tracking-[0.35em] mb-1.5">
                      Experience Level *
                    </label>
                    <select
                      value={newForm.recommendedExperienceLevel}
                      onChange={(e) => setNewForm((f) => ({ ...f, recommendedExperienceLevel: e.target.value }))}
                      className="w-full bg-[#080909] border border-white/[0.08] text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A24D]/50"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                {createError && (
                  <p className="text-red-400 text-xs">{createError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-[#C9A24D] text-black font-bold text-[10px] tracking-[0.3em] uppercase px-5 py-2.5 hover:bg-[#D4B56A] transition-colors disabled:opacity-50"
                  >
                    {creating ? "Creating…" : "Create Blueprint"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="text-gray-600 text-[11px] tracking-wide hover:text-gray-400 transition-colors px-3"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Page label */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-[10px] tracking-[0.5em] text-gray-600 uppercase font-semibold">
              Workout Templates
            </h2>
            {!loading && (
              <span className="text-[10px] text-gray-700">
                {templates.length} {templates.length === 1 ? "template" : "templates"}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/[0.05] border border-red-500/20 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && templates.length === 0 && (
            <div className="border border-white/[0.06] border-dashed px-8 py-12 text-center">
              <p className="text-gray-600 text-sm mb-2">No workout blueprints yet</p>
              <p className="text-gray-700 text-xs">
                Click{" "}
                <button
                  onClick={() => setShowNewForm(true)}
                  className="text-[#C9A24D] hover:text-[#D4B56A] transition-colors"
                >
                  New Blueprint
                </button>{" "}
                to create your first workout template.
              </p>
            </div>
          )}

          {/* Template list */}
          {!loading && templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#0d0e0f] border border-white/[0.06] px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-white font-semibold text-sm">{t.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${statusCls(t.status)}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-gray-700 text-[11px] font-mono">{t.slug}</span>
                      <span className={`text-[11px] font-medium ${expCls(t.recommendedExperienceLevel)}`}>
                        {t.recommendedExperienceLevel}
                      </span>
                      {t.primaryFocus && (
                        <span className="text-gray-600 text-[11px]">{t.primaryFocus}</span>
                      )}
                      {t.estimatedDurationMinutes && (
                        <span className="text-gray-600 text-[11px]">{t.estimatedDurationMinutes} min</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-700 text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                    <Link
                      href={`/admin/blueprints/${t.id}`}
                      className="text-[10px] tracking-[0.25em] uppercase font-semibold text-gray-500 border border-white/[0.08] px-3 py-1.5 hover:text-white hover:border-white/20 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
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
      </div>
    </AdminGate>
  );
}
