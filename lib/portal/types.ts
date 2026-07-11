// ─────────────────────────────────────────────────────────────
// Catalyst OS — Portal Type System
//
// All types for the client-facing Catalyst OS portal.
// TODO: When real data layers are connected, these types will map
// directly to database models and API response schemas.
// ─────────────────────────────────────────────────────────────

export type MissionStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "locked"
  | "not-scheduled"
  | "overdue";

export type MissionType =
  | "workout"
  | "nutrition"
  | "water"
  | "steps"
  | "sleep"
  | "check-in";

export type PortalScenario =
  | "default"
  | "zero"
  | "all-complete"
  | "recovery"
  | "check-in-day"
  | "travel"
  | "missed-yesterday";

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  subtitle: string;
  status: MissionStatus;
  /** Numeric target, e.g. 64 (oz), 10000 (steps) */
  target?: number;
  /** Current progress toward target */
  current?: number;
  /** Unit label for progress, e.g. "oz", "steps" */
  unit?: string;
  /** Label for the primary action button */
  actionLabel?: string;
}

export interface PortalStats {
  /** Active daily streak in days */
  streak: number;
  /** All-time count of individual Promises Kept */
  lifetimePromises: number;
}

export interface ScenarioData {
  clientName: string;
  missions: Mission[];
  stats: PortalStats;
  /** Optional banner shown at the top of the briefing */
  banner?: string;
}
