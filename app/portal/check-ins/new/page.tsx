// ─────────────────────────────────────────────────────────────
// Catalyst Portal — New / Continue Check-In
//
// Server Component. Loads the current draft (if any) and passes
// initial data to the CheckInForm Client Component.
//
// Auth: portal layout + role guard below.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireClientUser, getClientProfile } from "@/lib/supabase/session";
import {
  getCurrentCheckInWindow,
  getClientCheckInDetail,
  getPreviousCheckIn,
} from "@/lib/db/check-in-service";
import type { PreviousCheckInContext } from "@/components/portal/CheckInForm";
import PortalShell from "@/components/portal/PortalShell";
import CheckInForm from "@/components/portal/CheckInForm";

export const dynamic = "force-dynamic";

export default async function NewCheckInPage() {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const profile = await getClientProfile(dbUser.id);
  const clientName =
    profile?.preferredName ?? profile?.fullName ?? "Client";

  const window_ = await getCurrentCheckInWindow(dbUser.id);
  const { existingCheckIn } = window_;

  // If already submitted/reviewed, redirect to the detail view
  if (
    existingCheckIn &&
    existingCheckIn.status !== "draft"
  ) {
    redirect(`/portal/check-ins/${existingCheckIn.id}`);
  }

  // Load draft data and previous reviewed check-in in parallel.
  // Previous check-in data is shown as lightweight context alongside
  // form fields so clients can reflect on last week's values while
  // filling in this week's check-in.
  const [draft, prevCheckIn] = await Promise.all([
    existingCheckIn?.id
      ? getClientCheckInDetail(dbUser.id, existingCheckIn.id)
      : Promise.resolve(null),
    getPreviousCheckIn(dbUser.id, window_.weekStartDate),
  ]);

  const initialData = draft
    ? {
        bodyWeightLbs: draft.bodyWeightLbs ?? "",
        waistInches: draft.waistInches ?? "",
        averageSleepHours: draft.averageSleepHours ?? "",
        averageStress: draft.averageStress,
        averageEnergy: draft.averageEnergy,
        averageHunger: draft.averageHunger,
        digestionRating: draft.digestionRating,
        averageWaterOunces: draft.averageWaterOunces ? String(draft.averageWaterOunces) : "",
        averageSteps: draft.averageSteps ? String(draft.averageSteps) : "",
        workoutCompliancePct: draft.workoutCompliancePct,
        nutritionCompliancePct: draft.nutritionCompliancePct,
        wins: draft.wins ?? "",
        challenges: draft.challenges ?? "",
        questions: draft.questions ?? "",
        clientNotes: draft.clientNotes ?? "",
      }
    : undefined;

  const previousCheckIn: PreviousCheckInContext | null = prevCheckIn
    ? {
        bodyWeightLbs: prevCheckIn.bodyWeightLbs,
        waistInches: prevCheckIn.waistInches,
        averageSleepHours: prevCheckIn.averageSleepHours,
        averageStress: prevCheckIn.averageStress,
        averageEnergy: prevCheckIn.averageEnergy,
        averageHunger: prevCheckIn.averageHunger,
        digestionRating: prevCheckIn.digestionRating,
        averageWaterOunces: prevCheckIn.averageWaterOunces,
        averageSteps: prevCheckIn.averageSteps,
        workoutCompliancePct: prevCheckIn.workoutCompliancePct,
        nutritionCompliancePct: prevCheckIn.nutritionCompliancePct,
      }
    : null;

  return (
    <PortalShell clientName={clientName}>
      <div>
        {/* Back */}
        <Link
          href="/portal/check-ins"
          className="inline-flex items-center gap-1.5 text-gray-500 text-[10px] uppercase tracking-[0.2em] hover:text-gray-300 transition-colors mb-8"
        >
          ← Check-Ins
        </Link>

        <h1 className="text-white text-xl font-bold tracking-wide mb-2">
          {draft ? "Continue Check-In" : "New Check-In"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Be honest — your coach is here to help, not judge.
        </p>

        <CheckInForm
          initialData={initialData}
          existingCheckInId={existingCheckIn?.id}
          weekStartDate={window_.weekStartDate}
          previousCheckIn={previousCheckIn}
        />
      </div>
    </PortalShell>
  );
}
