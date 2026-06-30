// Centralized client lifecycle stage model — Catalyst Sales Workflow.
// All pipeline automation, UI state, and future integrations reference these types.
// Do not add implementation logic here — types and constants only.

export type LifecycleStage =
  | "Application Received"
  | "Strategy Call Booked"
  | "Strategy Call Completed"
  | "Approved"
  | "Agreement Sent"
  | "Agreement Signed"
  | "Payment Link Sent"
  | "Payment Received"
  | "Onboarding Started"
  | "Onboarding Complete"
  | "Program Build"
  | "Active Client"
  | "Paused"
  | "Cancelled";

// Ordered list — every automation step in the client lifecycle
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  "Application Received",
  "Strategy Call Booked",
  "Strategy Call Completed",
  "Approved",
  "Agreement Sent",
  "Agreement Signed",
  "Payment Link Sent",
  "Payment Received",
  "Onboarding Started",
  "Onboarding Complete",
  "Program Build",
  "Active Client",
  "Paused",
  "Cancelled",
];

export type StrategyCallOutcome =
  | "pending"
  | "approved"
  | "needs-follow-up"
  | "not-a-fit"
  | "no-show";

export type CoachingPackage =
  | "Legacy"
  | "Founding Member"
  | "Standard"
  | "Executive Performance";

export const COACHING_PACKAGES: CoachingPackage[] = [
  "Legacy",
  "Founding Member",
  "Standard",
  "Executive Performance",
];

export interface StrategyCallDecision {
  outcome: StrategyCallOutcome;
  package?: CoachingPackage;
  decidedAt: string;
}

export function outcomeNextAction(
  outcome: StrategyCallOutcome,
  pkg?: CoachingPackage,
): string {
  switch (outcome) {
    case "approved":        return pkg ? `Agreement Pending — ${pkg}` : "Agreement Pending";
    case "needs-follow-up": return "Send follow-up message";
    case "not-a-fit":       return "Archive or nurture later";
    case "no-show":         return "Send reschedule link";
    default:                return "";
  }
}
