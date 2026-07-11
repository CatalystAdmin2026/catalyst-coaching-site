// ─────────────────────────────────────────────────────────────
// Catalyst OS — Mission Briefing Data
//
// Architecture note: `getMissionBriefing` is intentionally async
// so the UI component requires no changes when AI-generated
// briefings replace this mock data.
//
// To wire in AI: change this function to call your AI API and
// return the same MissionBriefing shape. The MissionEntry
// component will animate correctly without modification.
// ─────────────────────────────────────────────────────────────

import type { PortalScenario } from "./types";

// ── Public interface ────────────────────────────────────────
// This shape is what AI responses must conform to.

export interface MissionBriefing {
  /** One-to-three sentence coaching message shown beneath the greeting. */
  coachingMessage: string;
  /** Short identity line shown on the mission card (< 12 words). */
  missionLine: string;
}

// ── Mock data ───────────────────────────────────────────────
// Scenario-keyed coaching copy. Rotate, refine, or replace freely.

const MOCK_BRIEFINGS: Record<PortalScenario, MissionBriefing> = {
  default: {
    coachingMessage:
      "Your upper-body push session is loaded and ready. Three missions are still open. Every rep you choose today is a vote for the athlete you are becoming.",
    missionLine: "Keep six promises. Build the person you’re becoming.",
  },
  zero: {
    coachingMessage:
      "Today is a clean slate. Six missions, one intention: show up fully. The hardest part is always the first step — take it now and let momentum follow.",
    missionLine: "Six promises are waiting. Start with one.",
  },
  "all-complete": {
    coachingMessage:
      "Every promise kept today. This is not luck or motivation — this is discipline compounding into something real. Rest well and come back stronger.",
    missionLine: "All six. The standard is set.",
  },
  recovery: {
    coachingMessage:
      "Your body is doing its real work today. Recovery is not optional — it is the mechanism through which training becomes results. Protect it.",
    missionLine: "Honor the rest. Adaptation happens here.",
  },
  "check-in-day": {
    coachingMessage:
      "Today you report on the work. Your check-in gives your coach everything needed to sharpen next week’s plan. Five honest minutes builds four better weeks.",
    missionLine: "Reflection is part of the process.",
  },
  travel: {
    coachingMessage:
      "The environment is different. The standard is the same. Executing in disruption is the skill that separates athletes who build lasting results from those who wait for perfect conditions.",
    missionLine: "The environment changed. The standard did not.",
  },
  "missed-yesterday": {
    coachingMessage:
      "Yesterday is settled. What you do today is the only thing that shapes what comes next. One promise at a time — start now.",
    missionLine: "Today’s promise is what counts.",
  },
};

// ── Data accessor ───────────────────────────────────────────
// Async signature is intentional — keeps the call site stable
// when this function is upgraded to an AI API call.

export async function getMissionBriefing(
  scenario: PortalScenario
): Promise<MissionBriefing> {
  // TODO: Replace with API call when AI briefings are enabled.
  // Example:
  //   const res = await fetch("/api/briefing", {
  //     method: "POST",
  //     body: JSON.stringify({ scenario }),
  //   });
  //   return res.json() as Promise<MissionBriefing>;
  return MOCK_BRIEFINGS[scenario];
}
