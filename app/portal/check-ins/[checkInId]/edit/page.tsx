// ─────────────────────────────────────────────────────────────
// Catalyst Portal — Edit Submitted Check-In
//
// Server Component. Loads the check-in, confirms it is still
// 'submitted' (server-enforced), then renders the edit form
// pre-populated with the existing values.
//
// Auth: portal layout + role guard below.
// Redirects to detail view if the check-in is not editable.
// ─────────────────────────────────────────────────────────────

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireClientUser } from "@/lib/supabase/session";
import { getClientCheckInDetail } from "@/lib/db/check-in-service";
import EditCheckInForm from "@/components/portal/EditCheckInForm";
import type { EditFormInitialData } from "@/components/portal/EditCheckInForm";

export const dynamic = "force-dynamic";

export default async function EditCheckInPage({
  params,
}: {
  params: Promise<{ checkInId: string }>;
}) {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") redirect("/admin");

  const { checkInId } = await params;

  const checkIn = await getClientCheckInDetail(dbUser.id, checkInId);
  if (!checkIn) notFound();

  // Server-side editability check — redirect if the coach has
  // already started reviewing (status is not 'submitted').
  if (checkIn.status !== "submitted") {
    redirect(`/portal/check-ins/${checkInId}`);
  }

  const initialData: EditFormInitialData = {
    bodyWeightLbs: checkIn.bodyWeightLbs ?? "",
    waistInches: checkIn.waistInches ?? "",
    averageSleepHours: checkIn.averageSleepHours ?? "",
    averageStress: checkIn.averageStress,
    averageEnergy: checkIn.averageEnergy,
    averageHunger: checkIn.averageHunger,
    digestionRating: checkIn.digestionRating,
    averageWaterOunces:
      checkIn.averageWaterOunces !== null ? String(checkIn.averageWaterOunces) : "",
    averageSteps:
      checkIn.averageSteps !== null ? String(checkIn.averageSteps) : "",
    workoutCompliancePct: checkIn.workoutCompliancePct,
    nutritionCompliancePct: checkIn.nutritionCompliancePct,
    wins: checkIn.wins ?? "",
    challenges: checkIn.challenges ?? "",
    questions: checkIn.questions ?? "",
    clientNotes: checkIn.clientNotes ?? "",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href={`/portal/check-ins/${checkInId}`}
        className="inline-flex items-center gap-1.5 text-gray-500 text-[10px] uppercase tracking-[0.2em] hover:text-gray-300 transition-colors mb-8"
      >
        ← Back to Check-In
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-xl font-bold tracking-wide">
          Edit Check-In
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Correct anything you want to update. Your original submission date is kept.
        </p>
      </div>

      <EditCheckInForm
        checkInId={checkInId}
        initialData={initialData}
        weekStartDate={checkIn.weekStartDate}
        submittedAt={checkIn.submittedAt}
      />
    </div>
  );
}
