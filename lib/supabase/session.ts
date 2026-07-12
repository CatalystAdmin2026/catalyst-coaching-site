// ─────────────────────────────────────────────────────────────
// Catalyst OS — Session Helpers
//
// SERVER-ONLY — never import from a Client Component.
//
// All helpers call supabase.auth.getUser() which validates the
// session JWT with the Supabase Auth server on every request.
// This is more secure than getSession() which only reads the
// local cookie without re-validating.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "./server";
import { getDb } from "@/lib/db/client";
import { users, clientProfiles } from "@/lib/db/schema";
import type { User } from "@supabase/supabase-js";

// ── Public types ────────────────────────────────────────────

export interface PublicUser {
  id: string;
  email: string;
  normalizedEmail: string;
  role: "client" | "coach" | "admin";
  status: "invited" | "active" | "suspended" | "archived";
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ClientSession {
  authUser: User;
  dbUser: PublicUser;
}

// ── Helpers ─────────────────────────────────────────────────

// Returns the Supabase auth user, or null if not authenticated.
// Validates the JWT with Supabase Auth on every call.
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Returns the auth user or redirects to /login.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Returns both the auth user and public.users record, or redirects.
// Redirects to /login if:
//   - no active session
//   - no public.users record exists yet (trigger may still be propagating)
//   - account is suspended or archived
//
// Does NOT redirect if status is 'invited' — an invited user who has
// authenticated via magic link is treated as a valid session; syncUserToPublic
// in the callback already transitions invited → active.
export async function requireClientUser(): Promise<ClientSession> {
  const authUser = await requireUser();
  const db = getDb();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  if (!dbUser) {
    // public.users row not yet created (trigger propagation delay).
    // Redirect to login with an informative state rather than crashing.
    redirect("/login?error=account_not_ready");
  }

  if (dbUser.status === "suspended" || dbUser.status === "archived") {
    redirect("/login?error=access_denied");
  }

  return { authUser, dbUser: dbUser as PublicUser };
}

// Returns the client profile for the given user, or null.
// Does not throw — callers decide how to handle a missing profile.
export async function getClientProfile(userId: string) {
  const db = getDb();
  return db.query.clientProfiles.findFirst({
    where: eq(clientProfiles.userId, userId),
  });
}

// Signs out the current user. Call from a Server Action or Route Handler.
// After calling, redirect to /login.
export async function signOutCurrentUser(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
