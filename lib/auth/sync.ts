// ─────────────────────────────────────────────────────────────
// Catalyst OS — Auth Identity Sync
//
// SERVER-ONLY — never import from a Client Component.
//
// syncUserToPublic() is called in the auth callback after a
// valid Supabase session is established. It is idempotent and
// safe to call on every login.
//
// What it does:
//   - Inserts a public.users row if not present (database trigger
//     handles this for brand-new auth.users rows, but this is a
//     safety net for the first login after trigger installation)
//   - Updates email and normalizedEmail if they changed
//   - Sets emailVerifiedAt from the auth record
//   - Transitions status invited → active on first verified login
//
// What it deliberately does NOT do:
//   - Never downgrade coach or admin roles
//   - Never set status to 'suspended' or 'archived'
//   - Never trust user-supplied metadata for role grants
//   - Never log or expose credentials or tokens
// ─────────────────────────────────────────────────────────────

import type { User } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const USER_COLS = {
  id: users.id,
  email: users.email,
  normalizedEmail: users.normalizedEmail,
  emailVerifiedAt: users.emailVerifiedAt,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  deletedAt: users.deletedAt,
} as const;

export async function syncUserToPublic(authUser: User): Promise<void> {
  const db = getDb();

  const emailVerifiedAt = authUser.email_confirmed_at
    ? new Date(authUser.email_confirmed_at)
    : null;

  await db
    .insert(users)
    .values({
      id: authUser.id,
      email: authUser.email!,
      normalizedEmail: authUser.email!.toLowerCase().trim(),
      emailVerifiedAt,
      role: "client",
      status: "active",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: authUser.email!,
        normalizedEmail: authUser.email!.toLowerCase().trim(),
        // Preserve existing emailVerifiedAt if already set; use auth record otherwise
        emailVerifiedAt: sql`COALESCE(${users.emailVerifiedAt}, EXCLUDED.email_verified_at)`,
        // Transition invited → active; never downgrade active, suspended, or archived
        status: sql`CASE
          WHEN ${users.status} = 'invited'
          THEN 'active'::"user_status"
          ELSE ${users.status}
        END`,
        // role is intentionally excluded: never overwrite with 'client'
        // if the record was promoted to coach or admin by an administrator
        updatedAt: sql`now()`,
      },
    });
}

// Returns the public.users record for the given auth UUID.
// Returns null if no record exists yet (trigger may not have fired yet).
export async function getPublicUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select(USER_COLS)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
