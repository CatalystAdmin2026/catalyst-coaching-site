// ─────────────────────────────────────────────────────────────
// Catalyst OS — Mock Data
//
// Prototype-only. All data is fabricated for design review.
// TODO: Replace with real client data from the coaching platform
// database once authentication and persistence are implemented.
// ─────────────────────────────────────────────────────────────

import type { Mission, PortalScenario, ScenarioData } from "./types";

const CLIENT_NAME = "Emma";

// ─────────────────────────────────────────────────────────────
// Mission template factory
// ─────────────────────────────────────────────────────────────

function workout(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "workout",
    type: "workout",
    title: "Complete Today's Workout",
    subtitle: "Upper Body · Push Focus · 45 min",
    status,
    actionLabel: "Start Today's Workout",
  };
}

function nutrition(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "nutrition",
    type: "nutrition",
    title: "Fuel Your Goal",
    subtitle: "Target: 155g protein · 1,840 kcal",
    status,
    target: 155,
    current: status === "in-progress" ? 92 : status === "completed" ? 155 : 0,
    unit: "g protein",
    actionLabel: "Log Today's Meals",
  };
}

function water(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "water",
    type: "water",
    title: "Reach Your Water Goal",
    subtitle: "64 oz minimum · stay ahead of thirst",
    status,
    target: 64,
    current: status === "in-progress" ? 40 : status === "completed" ? 64 : 0,
    unit: "oz",
    actionLabel: "Log Water",
  };
}

function steps(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "steps",
    type: "steps",
    title: "Reach Your Step Goal",
    subtitle: "8,000 steps · movement outside the gym",
    status,
    target: 8000,
    current: status === "in-progress" ? 5200 : status === "completed" ? 8000 : 0,
    unit: "steps",
    actionLabel: "Sync Steps",
  };
}

function sleep(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "sleep",
    type: "sleep",
    title: "Meet Your Sleep Goal",
    subtitle: "Last night: 7h 22m · Target: 7h 30m",
    status,
    actionLabel: "Review Sleep",
  };
}

function checkin(status: Mission["status"] = "not-started"): Mission {
  return {
    id: "check-in",
    type: "check-in",
    title: "Complete Your Check-In",
    subtitle: "Weekly progress report · due today",
    status,
    actionLabel: "Submit Today's Check-In",
  };
}

// ─────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────

const SCENARIOS: Record<PortalScenario, ScenarioData> = {
  first_day: {
    clientName: CLIENT_NAME,
    missions: [
      checkin("not-started"),
    ],
    stats: { streak: 0, lifetimePromises: 0 },
  },

  default: {
    clientName: CLIENT_NAME,
    missions: [
      workout("completed"),
      nutrition("completed"),
      water("in-progress"),
      steps("in-progress"),
      sleep("completed"),
      checkin("not-started"),
    ],
    stats: { streak: 18, lifetimePromises: 187 },
  },

  zero: {
    clientName: CLIENT_NAME,
    missions: [
      workout("not-started"),
      nutrition("not-started"),
      water("not-started"),
      steps("not-started"),
      sleep("not-started"),
      checkin("not-started"),
    ],
    stats: { streak: 18, lifetimePromises: 187 },
  },

  "all-complete": {
    clientName: CLIENT_NAME,
    missions: [
      workout("completed"),
      nutrition("completed"),
      water("completed"),
      steps("completed"),
      sleep("completed"),
      checkin("completed"),
    ],
    stats: { streak: 19, lifetimePromises: 189 },
  },

  recovery: {
    clientName: CLIENT_NAME,
    missions: [
      { ...workout("not-scheduled"), subtitle: "Rest day — no training today" },
      nutrition("not-started"),
      water("in-progress"),
      steps("not-started"),
      sleep("completed"),
      checkin("locked"),
    ],
    stats: { streak: 18, lifetimePromises: 187 },
  },

  "check-in-day": {
    clientName: CLIENT_NAME,
    missions: [
      workout("completed"),
      nutrition("in-progress"),
      water("completed"),
      steps("not-started"),
      sleep("completed"),
      checkin("not-started"),
    ],
    stats: { streak: 21, lifetimePromises: 203 },
  },

  travel: {
    clientName: CLIENT_NAME,
    missions: [
      { ...workout("not-started"), subtitle: "Hotel gym · bodyweight circuit · 30 min" },
      { ...nutrition("not-started"), subtitle: "Target: 130g protein · flexible tracking" },
      water("in-progress"),
      { ...steps("in-progress"), subtitle: "10,000 steps · walking replaces gym cardio" },
      sleep("not-started"),
      checkin("locked"),
    ],
    stats: { streak: 18, lifetimePromises: 187 },
    banner: "Travel Day — your program is adapted for today's environment.",
  },

  "missed-yesterday": {
    clientName: CLIENT_NAME,
    missions: [
      workout("overdue"),
      nutrition("not-started"),
      water("not-started"),
      steps("not-started"),
      sleep("completed"),
      checkin("not-started"),
    ],
    stats: { streak: 0, lifetimePromises: 187 },
    banner: "Yesterday is over. Today's promise is what matters.",
  },
};

export function getScenarioData(scenario: PortalScenario): ScenarioData {
  return SCENARIOS[scenario];
}

export const SCENARIO_LABELS: Record<PortalScenario, string> = {
  first_day:          "Day 1 — New Client",
  default:            "4 of 6 Complete",
  zero:               "0% — Nothing Started",
  "all-complete":     "All Complete",
  recovery:           "Recovery Day",
  "check-in-day":     "Check-In Day",
  travel:             "Travel Day",
  "missed-yesterday": "Missed Yesterday",
};
