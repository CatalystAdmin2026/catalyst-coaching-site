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

// ── Agreement Workflow ───────────────────────────────────────────────────

export type AgreementStatus =
  | "not_sent"
  | "sent"
  | "client_signed"
  | "awaiting_coach"
  | "fully_executed";

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  not_sent:       "Not Sent",
  sent:           "Sent",
  client_signed:  "Client Signed",
  awaiting_coach: "Awaiting Coach Finalization",
  fully_executed: "Fully Executed",
};

export interface AgreementState {
  status: AgreementStatus;
  packageName: CoachingPackage;
  monthlyRate: string;
  startDate: string;
  sentAt?: string;
  // TODO: Future — real DocuSign envelope ID, persisted to CRM/database
  envelopeId?: string;
  isDryRun?: boolean;
}

export function agreementNextAction(status: AgreementStatus): string {
  switch (status) {
    case "not_sent":       return "Send coaching agreement to client";
    case "sent":           return "Awaiting client signature";
    case "client_signed":  return "Client signed — review and finalize in DocuSign";
    case "awaiting_coach": return "Awaiting coach finalization";
    case "fully_executed": return "Agreement complete — send payment link";
  }
}

// Future DocuSign Connect webhook event types — Sprint 2B
// When DocuSign sends event notifications, status maps to one of:
export type DocuSignWebhookEvent =
  | "agreement_sent"
  | "client_signed"
  | "coach_finalized"
  | "agreement_completed"
  | "agreement_declined"
  | "agreement_voided";
