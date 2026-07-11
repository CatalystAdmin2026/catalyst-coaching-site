"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { PortalScenario } from "@/lib/portal/types";
import { SCENARIO_LABELS } from "@/lib/portal/mockData";

interface Props {
  scenario: PortalScenario;
  onScenarioChange: (s: PortalScenario) => void;
}

const SCENARIOS = Object.keys(SCENARIO_LABELS) as PortalScenario[];

export default function PrototypeControls({ scenario, onScenarioChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
      {/* Scenario list */}
      {open && (
        <div className="bg-[#141618]/96 backdrop-blur-md border border-white/10 rounded-sm p-3 flex flex-col gap-1 min-w-[220px] shadow-2xl">
          <p className="text-[9px] text-white/30 font-semibold tracking-[0.14em] uppercase px-1 pb-1 mb-0.5 border-b border-white/[0.06]">
            Prototype Scenario
          </p>
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onScenarioChange(s); setOpen(false); }}
              className={`text-left px-2.5 py-1.5 rounded-sm text-xs transition-colors ${
                s === scenario
                  ? "bg-[#c9a24d]/15 text-[#c9a24d] font-semibold"
                  : "text-white/55 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {SCENARIO_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141618]/96 backdrop-blur-md border border-white/10 rounded-sm text-[10px] text-white/50 hover:text-white/80 transition-colors shadow-xl"
      >
        <span className="tracking-[0.1em] uppercase font-semibold">Prototype</span>
        {open ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
      </button>
    </div>
  );
}
