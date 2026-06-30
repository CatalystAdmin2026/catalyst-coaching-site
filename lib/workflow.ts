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

// Single source of truth for all package metadata.
// Downstream systems (Stripe, DocuSign) should reference this config.
export interface PackageConfig {
  key: CoachingPackage;
  displayName: string;
  monthlyRate: string;       // numeric string, e.g. "300"
  monthlyRateLabel: string;  // formatted label, e.g. "$300/month"
  // TODO: Future — map each package to its Stripe Price ID for automated payment link generation
  stripePriceId: string | null;
  // TODO: Future — map each package to a DocuSign template variant if agreement differs by tier
  docusignTemplateId: string | null;
}

export const PACKAGE_CONFIG: Record<CoachingPackage, PackageConfig> = {
  "Legacy": {
    key:              "Legacy",
    displayName:      "Legacy",
    monthlyRate:      "120",
    monthlyRateLabel: "$120/month",
    stripePriceId:    null,
    docusignTemplateId: null,
  },
  "Founding Member": {
    key:              "Founding Member",
    displayName:      "Founding Member",
    monthlyRate:      "150",
    monthlyRateLabel: "$150/month",
    stripePriceId:    null,
    docusignTemplateId: null,
  },
  "Standard": {
    key:              "Standard",
    displayName:      "Standard",
    monthlyRate:      "300",
    monthlyRateLabel: "$300/month",
    stripePriceId:    null,
    docusignTemplateId: null,
  },
  "Executive Performance": {
    key:              "Executive Performance",
    displayName:      "Executive Performance",
    monthlyRate:      "1500",
    monthlyRateLabel: "$1,500/month",
    stripePriceId:    null,
    docusignTemplateId: null,
  },
};

export interface StrategyCallDecision {
  outcome: StrategyCallOutcome;
  package?: CoachingPackage;
  // Stored at approval time from PACKAGE_CONFIG — avoids repeated lookups downstream
  monthlyRate?: string;
  monthlyRateLabel?: string;
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
  monthlyRateLabel: string;
  startDate: string;
  sentAt?: string;
  // TODO: Future — real DocuSign envelope ID, persisted to CRM/database
  envelopeId?: string;
  isDryRun?: boolean;
  // TODO: Future — track rate overrides separately for audit trail
  rateWasOverridden?: boolean;
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
