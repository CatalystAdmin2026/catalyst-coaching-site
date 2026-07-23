"use server";

// ─────────────────────────────────────────────────────────────
// Catalyst HQ — Client Workspace Server Actions (Sprint 6.3A)
//
// Server actions run on the server and can be called from Client
// Components. Each action re-validates auth independently because
// Server Actions bypass middleware.
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { clientGoals, type GoalType } from "@/lib/db/schema-profile";
import { archiveAndAssignProgram } from "@/lib/db/coach-program-assignment-service";

// ─────────────────────────────────────────────────────────────
// AUTH HELPER
// ─────────────────────────────────────────────────────────────

// TODO (multi-tenancy): assertCoachOrAdmin validates role only, not coach→client
// ownership. Once multi-tenancy ships, join coachingEnrollments here and confirm
// the acting coach is enrolled with the target clientId.
async function assertCoachOrAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Unauthorized" };

  const db = getDb();
  const [dbUser] = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) return { ok: false, error: "Unauthorized" };
  if (dbUser.role !== "coach" && dbUser.role !== "admin") {
    return { ok: false, error: "Forbidden" };
  }
  if (dbUser.status === "suspended" || dbUser.status === "archived") {
    return { ok: false, error: "Forbidden" };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// ASSIGN PROGRAM ACTION
//
// Archives the client's current active program (if any) and
// creates a new active assignment. Revalidates all HQ pages
// that display program state so the coach sees fresh data.
// ─────────────────────────────────────────────────────────────

export async function assignProgramAction(data: {
  clientId: string;
  programTemplateId: string;
  startDate: string;
  coachNotes?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  // Validate required fields
  if (!data.clientId || !data.programTemplateId || !data.startDate) {
    return { ok: false, error: "Missing required fields." };
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) {
    return { ok: false, error: "Invalid date format." };
  }

  const result = await archiveAndAssignProgram({
    clientId: data.clientId,
    programTemplateId: data.programTemplateId,
    startDate: data.startDate,
    coachNotes: data.coachNotes ?? null,
  });

  if (result.ok) {
    // Revalidate all HQ views that show program state
    revalidatePath(`/hq/clients/${data.clientId}`);
    revalidatePath("/hq/clients");
    revalidatePath("/hq");
  }

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// ─────────────────────────────────────────────────────────────
// GOAL ACTIONS
//
// Create a new active goal for the client (coach-created).
// Archive (supersede) an existing goal.
// Goals are never deleted — status changes only.
// ─────────────────────────────────────────────────────────────

export async function saveGoalAction(data: {
  clientId: string;
  goalType: GoalType;
  description: string;
  targetDate?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!data.clientId || !data.description.trim()) {
    return { ok: false, error: "Missing required fields." };
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  await db.insert(clientGoals).values({
    clientId: data.clientId,
    goalType: data.goalType,
    description: data.description.trim(),
    targetDate: data.targetDate ?? null,
    status: "active",
    startedAt: today,
  });

  revalidatePath(`/hq/clients/${data.clientId}`);
  return { ok: true };
}

export async function archiveGoalAction(
  goalId: string,
  clientId: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await assertCoachOrAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!goalId || !clientId) {
    return { ok: false, error: "Missing required fields." };
  }

  const db = getDb();
  await db
    .update(clientGoals)
    .set({ status: "superseded", updatedAt: new Date() })
    .where(and(eq(clientGoals.id, goalId), eq(clientGoals.clientId, clientId)));

  revalidatePath(`/hq/clients/${clientId}`);
  return { ok: true };
}
