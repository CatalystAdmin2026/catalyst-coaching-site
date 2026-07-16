"use server";

import { revalidatePath } from "next/cache";
import { requireClientUser } from "@/lib/supabase/session";
import {
  createOrUpdateDraftCheckIn,
  submitCheckIn,
  type CheckInDraftData,
} from "@/lib/db/check-in-service";

// ─────────────────────────────────────────────────────────────
// SAVE DRAFT
//
// Creates or updates the current week's draft check-in.
// Re-validates auth on every call (server actions bypass middleware).
// ─────────────────────────────────────────────────────────────

export async function saveDraftCheckInAction(
  data: CheckInDraftData,
): Promise<{ ok: boolean; checkInId?: string; error?: string }> {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") {
    return { ok: false, error: "Forbidden" };
  }

  const result = await createOrUpdateDraftCheckIn(dbUser.id, data);

  if (result.ok) {
    revalidatePath("/portal/check-ins");
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// SUBMIT
//
// Transitions draft → submitted for the given check-in.
// ─────────────────────────────────────────────────────────────

export async function submitCheckInAction(
  checkInId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { dbUser } = await requireClientUser();
  if (dbUser.role !== "client") {
    return { ok: false, error: "Forbidden" };
  }

  const result = await submitCheckIn(dbUser.id, checkInId);

  if (result.ok) {
    revalidatePath("/portal/check-ins");
    revalidatePath(`/portal/check-ins/${checkInId}`);
  }

  return result;
}
