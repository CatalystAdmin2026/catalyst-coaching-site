"use server";

import { revalidatePath } from "next/cache";
import { requireCoachOrAdmin } from "@/lib/auth/guards";
import {
  startCheckInReview,
  saveCoachResponseDraft,
  markCheckInReviewed,
  reopenCheckIn,
} from "@/lib/db/coach-check-in-service";

// ─────────────────────────────────────────────────────────────
// AUTH HELPER
// ─────────────────────────────────────────────────────────────

// TODO (multi-tenancy): requireCoachOrAdmin validates role only, not
// coach→client ownership. When multi-tenancy ships, verify the acting
// coach is enrolled with the target client before mutating.
async function assertCoachOrAdmin(): Promise<
  { ok: true; coachId: string } | { ok: false; error: string }
> {
  const guard = await requireCoachOrAdmin();
  if (!guard.ok) return { ok: false, error: "Unauthorized" };
  return { ok: true, coachId: guard.dbUser.id };
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────

export async function startReviewAction(
  checkInId: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await startCheckInReview(checkInId, auth.coachId);

  if (result.ok) {
    revalidatePath(`/hq/check-ins/${checkInId}`);
    revalidatePath("/hq/check-ins");
  }

  return result;
}

export async function saveDraftResponseAction(
  checkInId: string,
  response: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await saveCoachResponseDraft(checkInId, auth.coachId, response);

  if (result.ok) {
    revalidatePath(`/hq/check-ins/${checkInId}`);
  }

  return result;
}

export async function markReviewedAction(
  checkInId: string,
  response: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await markCheckInReviewed(checkInId, auth.coachId, response);

  if (result.ok) {
    revalidatePath(`/hq/check-ins/${checkInId}`);
    revalidatePath("/hq/check-ins");
  }

  return result;
}

export async function reopenCheckInAction(
  checkInId: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const result = await reopenCheckIn(checkInId, auth.coachId);

  if (result.ok) {
    revalidatePath(`/hq/check-ins/${checkInId}`);
    revalidatePath("/hq/check-ins");
  }

  return result;
}
