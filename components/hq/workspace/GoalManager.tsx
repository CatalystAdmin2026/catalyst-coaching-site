"use client";

import { useState, useTransition } from "react";
import { saveGoalAction, archiveGoalAction } from "@/app/hq/clients/[clientId]/actions";
import type { WorkspaceGoal } from "@/lib/db/coach-client-workspace-service";
import type { GoalType } from "@/lib/db/schema-profile";

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "fat_loss",              label: "Fat Loss" },
  { value: "muscle_gain",           label: "Muscle Gain" },
  { value: "body_recomposition",    label: "Body Recomposition" },
  { value: "strength",              label: "Strength" },
  { value: "athletic_performance",  label: "Athletic Performance" },
  { value: "general_health",        label: "General Health" },
  { value: "mobility",              label: "Mobility" },
  { value: "competition_prep",      label: "Competition Prep" },
  { value: "reverse_diet",          label: "Reverse Diet" },
  { value: "maintenance",           label: "Maintenance" },
  { value: "executive_performance", label: "Executive Performance" },
  { value: "custom",                label: "Custom" },
];

function fmtGoalType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(str: string): string {
  return new Date(str + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

interface Props {
  goals: WorkspaceGoal[];
  clientId: string;
}

export default function GoalManager({ goals, clientId }: Props) {
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<GoalType>("fat_loss");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveGoalAction({
        clientId,
        goalType,
        description,
        targetDate: targetDate || null,
      });
      if (result.ok) {
        setAdding(false);
        setDescription("");
        setTargetDate("");
        setGoalType("fat_loss");
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  function handleArchive(goalId: string) {
    setError(null);
    startTransition(async () => {
      const result = await archiveGoalAction(goalId, clientId);
      if (!result.ok) setError(result.error ?? "Archive failed.");
    });
  }

  const fieldCls =
    "w-full bg-[#111] border border-white/[0.08] text-white text-xs px-3 py-2 focus:outline-none focus:border-white/20 placeholder:text-gray-600";

  return (
    <div className="space-y-2">
      {goals.length === 0 && !adding && (
        <p className="text-gray-600 text-xs py-1">No active goals on file.</p>
      )}

      {goals.map((g) => (
        <div
          key={g.id}
          className="bg-[#0d0e0f] border border-white/[0.06] px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white text-xs font-medium">{g.description}</p>
              <p className="text-gray-500 text-[9px]">
                {fmtGoalType(g.goalType)}
                {g.targetDate && ` · ${fmtDate(g.targetDate)}`}
                {g.priority !== null && ` · Priority ${g.priority}`}
              </p>
            </div>
            <button
              onClick={() => handleArchive(g.id)}
              disabled={isPending}
              className="text-[9px] text-gray-600 hover:text-red-400/70 transition-colors shrink-0 disabled:opacity-40 pt-0.5"
            >
              Archive
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form
          onSubmit={handleSubmit}
          className="bg-[#0d0e0f] border border-white/[0.06] p-3 space-y-2.5"
        >
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
            className={`${fieldCls} bg-[#111]`}
          >
            {GOAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Lose 20 lbs"
            required
            rows={2}
            className={`${fieldCls} resize-none`}
          />

          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className={fieldCls}
            title="Target date (optional)"
          />

          {error && (
            <p className="text-red-400/70 text-[10px]">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending || !description.trim()}
              className="text-[10px] font-semibold text-black bg-[#c9a24d] px-4 py-2 hover:bg-[#d4af63] transition-colors disabled:opacity-40 uppercase tracking-[0.2em]"
            >
              {isPending ? "Saving…" : "Save Goal"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-[10px] text-gray-500 hover:text-white transition-colors px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[9px] text-gray-500 hover:text-[#c9a24d]/80 transition-colors py-1 uppercase tracking-[0.2em]"
        >
          + Add Goal
        </button>
      )}
    </div>
  );
}
